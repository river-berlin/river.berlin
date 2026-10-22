import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT_DIR, 'newnew_de.backup');
const TOP4000_PATH = path.join(ROOT_DIR, 'app/src/routes/projects/chatgpt-flashcards-trainer/data/top4000_cases.json');
const OUTPUT_PATH = path.join(ROOT_DIR, 'app/src/routes/projects/chatgpt-flashcards-trainer/data/reword_backup_words.json');

console.log('Loading existing case exercises from:', TOP4000_PATH);
let existingCasesByWordId = new Map();
if (fs.existsSync(TOP4000_PATH)) {
  const topCases = JSON.parse(fs.readFileSync(TOP4000_PATH, 'utf8'));
  for (const c of topCases) {
    if (!existingCasesByWordId.has(c.wordId)) {
      existingCasesByWordId.set(c.wordId, []);
    }
    existingCasesByWordId.get(c.wordId).push(c);
  }
}
console.log(`Loaded existing cases for ${existingCasesByWordId.size} words.`);

// Query all words from SQLite
const query = `
  SELECT 
    w.ID as id,
    w.WORD as word,
    w.ENG as meaning,
    w.POS as pos,
    w.Q_REC as q_rec,
    w.Q_REP as q_rep,
    w.S_REC as s_rec,
    w.S_REP as s_rep,
    w.I_REC as i_rec,
    w.I_REP as i_rep,
    w.T_REC as t_rec,
    w.T_REP as t_rep,
    w.EXAMPLES_ENG as examples_raw,
    GROUP_CONCAT(DISTINCT wc.CATEGORY_ID) as categories
  FROM WORD w
  LEFT JOIN WORD_CATEGORY wc ON w.ID = wc.WORD_ID
  GROUP BY w.ID
  ORDER BY w.ID ASC;
`;

console.log('Extracting all words from SQLite database:', DB_PATH);
const jsonStr = execSync(`sqlite3 "${DB_PATH}" ".mode json" "${query.replace(/\n/g, ' ')}"`, {
  maxBuffer: 50 * 1024 * 1024,
  encoding: 'utf8'
});

const rows = JSON.parse(jsonStr);
console.log(`Extracted ${rows.length} total rows.`);

function detectPos(rawWord, posNumber) {
  const clean = rawWord.trim();
  if (/^(der|die|das)\s+/i.test(clean)) {
    return 'noun';
  }
  const pos = posNumber || 0;
  if ((pos & 2) !== 0) return 'verb';
  if ((pos & 4) !== 0) return 'adjective';
  if ((pos & 8) !== 0) return 'adverb';
  if ((pos & 1) !== 0) return 'noun';
  return 'other';
}

function parseGenderAndBaseNoun(rawWord, posType) {
  const clean = rawWord.trim();
  const match = clean.match(/^(der|die|das)\s+([A-ZÄÖÜa-zäöüß\-]+)/i);
  if (match) {
    const article = match[1].toLowerCase();
    const baseNoun = match[2];
    const gender = article === 'der' ? 'm' : article === 'die' ? 'f' : 'n';
    return { article, baseNoun, gender };
  }
  if (posType === 'noun') {
    const parts = clean.split(/[\s(]/);
    return { article: '', baseNoun: parts[0] || clean, gender: 'n' };
  }
  return { article: '', baseNoun: clean, gender: null };
}

function extractEnglishMeaning(engRaw, examplesRaw) {
  let meaning = (engRaw || '').trim();
  if (meaning) return meaning;
  if (examplesRaw) {
    try {
      const parsed = JSON.parse(examplesRaw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const m = item.t?.match(/#([^#]+)#/);
          if (m && m[1]) {
            return m[1].trim();
          }
        }
      }
    } catch (e) {}
  }
  return '';
}

function determineTier(catString) {
  if (!catString) return 'allgemein';
  const cats = catString.split(',');
  if (cats.includes('top1000')) return 'top1000';
  if (cats.includes('top2000')) return 'top2000';
  if (cats.includes('top3000')) return 'top3000';
  if (cats.includes('top4000')) return 'top4000';
  return cats[0] || 'allgemein';
}

const convertedWords = [];

for (const r of rows) {
  const pos = detectPos(r.word, r.pos);
  const { article, baseNoun, gender } = parseGenderAndBaseNoun(r.word, pos);
  const meaning = extractEnglishMeaning(r.meaning, r.examples_raw);
  
  // ReWord Queues & Steps
  const qRep = r.q_rep || 0;
  const qRec = r.q_rec || 0;
  const sRep = r.s_rep || 0;
  const sRec = r.s_rec || 0;
  const maxQ = Math.max(qRep, qRec);
  const maxStep = Math.max(sRep, sRec);
  const maxInterval = Math.max(r.i_rep || 0, r.i_rec || 0);
  const lastReviewTime = Math.max(r.t_rep || 0, r.t_rec || 0);

  // Status mapping
  let rewordStatus = 'new';
  let defaultLearningFocus = 'word_and_genus';
  let repsRemaining = 10;

  if (maxQ === 4) {
    rewordStatus = 'completed'; // Fertig gemacht in ReWord!
    defaultLearningFocus = pos === 'noun' ? 'genus_only' : 'already_known';
    repsRemaining = 0;
  } else if (maxQ === 2) {
    rewordStatus = 'in_review'; // Im Wiederholungszyklus
    defaultLearningFocus = 'in_review';
    repsRemaining = Math.max(1, 10 - maxStep);
  } else if (maxQ === 3) {
    rewordStatus = 'already_known'; // Bereits bekannt / übersprungen
    defaultLearningFocus = 'already_known';
    repsRemaining = 0;
  } else {
    rewordStatus = 'new';
    defaultLearningFocus = 'word_and_genus';
    repsRemaining = 10;
  }

  // Parse examples if any
  let parsedExamples = [];
  if (r.examples_raw) {
    try {
      const parsed = JSON.parse(r.examples_raw);
      if (Array.isArray(parsed)) {
        parsedExamples = parsed.slice(0, 4).map(ex => ({
          german: (ex.o || '').replace(/#/g, ''),
          english: (ex.t || '').replace(/#/g, '')
        }));
      }
    } catch (e) {}
  }

  // Get case exercises if previously generated (store compactly)
  const rawEx = existingCasesByWordId.get(r.id) || [];
  const cases = rawEx.map(e => ({
    case: e.case,
    sentence: (e.sentenceStart || '') + e.targetAnswer + (e.sentenceEnd || ''),
    translation: e.translation || ''
  }));

  convertedWords.push({
    wordId: r.id,
    word: r.word,
    baseNoun,
    article,
    gender,
    pos,
    meaning,
    category: determineTier(r.categories),
    allCategories: r.categories ? r.categories.split(',') : [],
    rewordQueue: maxQ,
    rewordStep: maxStep,
    rewordIntervalDays: Math.round(maxInterval / 86400),
    lastReviewTimestamp: lastReviewTime,
    rewordStatus,
    learningFocus: defaultLearningFocus,
    repsRemaining,
    examples: parsedExamples.slice(0, 2),
    cases
  });
}

console.log(`Processed ${convertedWords.length} words.`);
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(convertedWords, null, 2));
console.log(`Saved successfully to ${OUTPUT_PATH} (Size: ${(fs.statSync(OUTPUT_PATH).size / (1024 * 1024)).toFixed(2)} MB)`);
