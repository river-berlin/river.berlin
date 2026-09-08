import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT_DIR, 'reword_de-new.backup');
const TOP1000_PATH = path.join(ROOT_DIR, 'app/src/routes/projects/german-cases-trainer/data/top1000_cases.json');
const OUTPUT_PATH = path.join(ROOT_DIR, 'app/src/routes/projects/german-cases-trainer/data/top4000_cases.json');

const args = process.argv.slice(2);
let cliKey = '';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--api-key' && args[i + 1]) {
    cliKey = args[i + 1];
    break;
  } else if (args[i].startsWith('--api-key=')) {
    cliKey = args[i].split('=')[1];
    break;
  }
}

const OPENROUTER_KEY = cliKey || process.env.OPENROUTER_API_KEY || '';
const MODEL = 'google/gemini-3.8-flash';

// 1. Extract Nouns from SQLite database with their respective tier
function getAllNounsFromSqlite() {
  const query = `
    SELECT 
      w.ID as id, 
      w.WORD as word, 
      w.ENG as meaning,
      CASE 
        WHEN wc1.WORD_ID IS NOT NULL THEN 'top1000'
        WHEN wc2.WORD_ID IS NOT NULL THEN 'top2000'
        WHEN wc3.WORD_ID IS NOT NULL THEN 'top3000'
        ELSE 'top4000'
      END as tier
    FROM WORD w
    JOIN WORD_CATEGORY wc ON w.ID = wc.WORD_ID AND wc.CATEGORY_ID = 'top4000'
    LEFT JOIN WORD_CATEGORY wc1 ON w.ID = wc1.WORD_ID AND wc1.CATEGORY_ID = 'top1000'
    LEFT JOIN WORD_CATEGORY wc2 ON w.ID = wc2.WORD_ID AND wc2.CATEGORY_ID = 'top2000'
    LEFT JOIN WORD_CATEGORY wc3 ON w.ID = wc3.WORD_ID AND wc3.CATEGORY_ID = 'top3000'
    WHERE w.POS = 1
    GROUP BY w.ID
    ORDER BY 
      CASE tier
        WHEN 'top1000' THEN 1
        WHEN 'top2000' THEN 2
        WHEN 'top3000' THEN 3
        WHEN 'top4000' THEN 4
      END ASC,
      w.ID ASC;
  `;
  const jsonStr = execSync(`sqlite3 "${DB_PATH}" ".mode json" "${query.replace(/\n/g, ' ')}"`, {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024
  });
  return JSON.parse(jsonStr);
}

// 2. Parse dictionary string: "der Raum (die Räume)" -> { article: "der", baseNoun: "Raum", gender: "m" }
function parseNounInfo(rawWord) {
  const clean = rawWord.trim();
  const match = clean.match(/^(der|die|das)\s+([A-ZÄÖÜa-zäöüß\-]+)/);
  if (match) {
    const article = match[1].toLowerCase();
    const baseNoun = match[2];
    const gender = article === 'der' ? 'm' : article === 'die' ? 'f' : 'n';
    return { article, baseNoun, gender };
  }
  // Irregular nouns fallback
  if (clean.startsWith('GmbH')) return { article: 'die', baseNoun: 'GmbH', gender: 'f' };
  if (clean.startsWith('deutsch, das Deutsch')) return { article: 'das', baseNoun: 'Deutsch', gender: 'n' };
  if (clean.startsWith('bestimmen')) return { article: 'das', baseNoun: 'Bestimmen', gender: 'n' };
  if (clean.startsWith('AIDS')) return { article: 'das', baseNoun: 'AIDS', gender: 'n' };
  if (clean.startsWith('BSE')) return { article: 'die', baseNoun: 'BSE', gender: 'f' };
  if (clean.startsWith('Celsius')) return { article: 'das', baseNoun: 'Celsius', gender: 'n' };

  const words = clean.split(/[\s(]/);
  return { article: '', baseNoun: words[0], gender: 'n' };
}

const DETERMINERS = {
  def: {
    label: 'der/die/das',
    hint: 'der/die/das (der, die, das, den, dem, des)',
    decl: {
      m: { nominativ: 'der', akkusativ: 'den', dativ: 'dem' },
      f: { nominativ: 'die', akkusativ: 'die', dativ: 'der' },
      n: { nominativ: 'das', akkusativ: 'das', dativ: 'dem' }
    }
  },
  indef: {
    label: 'ein-',
    hint: 'ein- (ein, eine, einen, einem, einer, eines)',
    decl: {
      m: { nominativ: 'ein', akkusativ: 'einen', dativ: 'einem' },
      f: { nominativ: 'eine', akkusativ: 'eine', dativ: 'einer' },
      n: { nominativ: 'ein', akkusativ: 'ein', dativ: 'einem' }
    }
  },
  poss: {
    label: 'mein-',
    hint: 'mein- (mein, meine, meinen, meinem, meiner)',
    decl: {
      m: { nominativ: 'mein', akkusativ: 'meinen', dativ: 'meinem' },
      f: { nominativ: 'meine', akkusativ: 'meine', dativ: 'meiner' },
      n: { nominativ: 'mein', akkusativ: 'mein', dativ: 'meinem' }
    }
  },
  dies: {
    label: 'dies-',
    hint: 'dies- (dieser, diese, dieses, diesen, diesem)',
    decl: {
      m: { nominativ: 'dieser', akkusativ: 'diesen', dativ: 'diesem' },
      f: { nominativ: 'diese', akkusativ: 'diese', dativ: 'dieser' },
      n: { nominativ: 'dieses', akkusativ: 'dieses', dativ: 'diesem' }
    }
  },
  solch: {
    label: 'ein solcher',
    hint: 'ein solcher (ein solcher, eine solche, einen solchen...)',
    decl: {
      m: { nominativ: 'ein solcher', akkusativ: 'einen solchen', dativ: 'einem solchen' },
      f: { nominativ: 'eine solche', akkusativ: 'eine solche', dativ: 'einer solchen' },
      n: { nominativ: 'ein solches', akkusativ: 'ein solches', dativ: 'einem solchen' }
    }
  },
  ander: {
    label: 'ein anderer',
    hint: 'ein anderer (ein anderer, eine andere, einen anderen...)',
    decl: {
      m: { nominativ: 'ein anderer', akkusativ: 'einen anderen', dativ: 'einem anderen' },
      f: { nominativ: 'eine andere', akkusativ: 'eine andere', dativ: 'einer anderen' },
      n: { nominativ: 'ein anderes', akkusativ: 'ein anderes', dativ: 'einem anderen' }
    }
  },
  kein: {
    label: 'kein-',
    hint: 'kein- (kein, keine, keinen, keinem, keiner)',
    decl: {
      m: { nominativ: 'kein', akkusativ: 'keinen', dativ: 'keinem' },
      f: { nominativ: 'keine', akkusativ: 'keine', dativ: 'keiner' },
      n: { nominativ: 'kein', akkusativ: 'kein', dativ: 'keinem' }
    }
  }
};

const DETERMINER_GROUPS = ['def', 'indef', 'poss', 'dies', 'solch', 'ander', 'kein'];

// 3. Clean exercises helper
function cleanExercises(list) {
  const contractions = [
    { regex: /^(.*)\bIm\s+$/i, replace: '$1In ' },
    { regex: /^(.*)\bAm\s+$/i, replace: '$1An ' },
    { regex: /^(.*)\bZum\s+$/i, replace: '$1Zu ' },
    { regex: /^(.*)\bZur\s+$/i, replace: '$1Zu ' },
    { regex: /^(.*)\bVom\s+$/i, replace: '$1Von ' },
    { regex: /^(.*)\bBeim\s+$/i, replace: '$1Bei ' },
    { regex: /^(.*)\bIns\s+$/i, replace: '$1In ' },
    { regex: /^(.*)\bAns\s+$/i, replace: '$1An ' }
  ];
  const articles = ['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines'];

  return list.map(d => {
    for (const c of contractions) {
      if (c.regex.test(d.sentenceStart)) {
        const firstWord = d.targetAnswer.trim().split(/\s+/)[0]?.toLowerCase();
        if (['dem', 'der', 'das', 'einem', 'einer', 'diesem', 'dieser', 'solchem', 'solcher', 'anderem', 'anderer', 'keinem', 'keiner', 'meinem', 'meiner'].includes(firstWord)) {
          d.sentenceStart = d.sentenceStart.replace(c.regex, c.replace);
        }
      }
    }

    const startWords = d.sentenceStart.trim().split(/\s+/);
    const lastStartWord = startWords[startWords.length - 1]?.toLowerCase();
    const targetWords = d.targetAnswer.trim().split(/\s+/);

    if (targetWords.length === 1 && articles.includes(lastStartWord)) {
      const art = startWords.pop();
      d.sentenceStart = startWords.length > 0 ? (startWords.join(' ') + ' ') : '';
      d.targetAnswer = `${art} ${d.targetAnswer}`;
    }

    if (d.sentenceStart.toLowerCase().includes('solch ein') && targetWords.length === 1) {
      const art = d.sentenceStart.trim();
      d.sentenceStart = '';
      d.targetAnswer = `${art} ${d.targetAnswer}`;
    }

    d.fullSentence = `${d.sentenceStart}${d.targetAnswer}${d.sentenceEnd}`;
    const acc = new Set(d.acceptedAnswers || []);
    acc.add(d.targetAnswer.toLowerCase());
    d.acceptedAnswers = Array.from(acc);
    return d;
  });
}

// 4. Batch generation call
async function generateBatch(nounsBatch, batchIdx) {
  const UNIQUE_NOUNS = ['Sonne', 'Erde', 'Mond', 'Himmel', 'Welt'];

  const requests = [];
  nounsBatch.forEach((n, idx) => {
    const { baseNoun, gender } = parseNounInfo(n.word);
    const isUnique = UNIQUE_NOUNS.includes(baseNoun);

    const gNom = isUnique ? 'def' : DETERMINER_GROUPS[(batchIdx * 3 + idx) % DETERMINER_GROUPS.length];
    const gAkk = isUnique ? 'def' : DETERMINER_GROUPS[(batchIdx * 3 + idx + 2) % DETERMINER_GROUPS.length];
    const gDat = isUnique ? 'def' : DETERMINER_GROUPS[(batchIdx * 3 + idx + 4) % DETERMINER_GROUPS.length];

    const cases = [
      { c: 'nominativ', g: gNom },
      { c: 'akkusativ', g: gAkk },
      { c: 'dativ', g: gDat }
    ];

    cases.forEach(({ c, g }) => {
      const detInfo = DETERMINERS[g];
      const art = detInfo?.decl[gender]?.[c] || 'der';
      const reqTarget = `${art} ${baseNoun}`;

      requests.push({
        wordId: n.id,
        originalWord: n.word,
        baseNoun,
        gender,
        case: c,
        determinerGroup: g,
        determinerHint: detInfo?.hint || '(der, die, das)',
        requiredTarget: reqTarget,
        tier: n.tier
      });
    });
  });

  const prompt = `
Du bist ein renommierter deutscher Sprachwissenschaftler und Didaktiker.
Deine Aufgabe ist es, für die folgenden deutschen Nomen im geforderten Kasus und mit dem geforderten Begleitwort-Muster jeweils EINEN 100% NATÜRLICHEN, authentischen Alltags-Übungssatz zur Satzvervollständigung zu erstellen.

WICHTIGE GRAMMATISCHE REGELN:
1. "targetAnswer" MUSS das Nomen mit dem geforderten Begleitwort im geforderten Kasus sein (z.B. "${requests[0]?.requiredTarget || 'einem solchen Raum'}", "keine Zeit", "meinem Freund", "einen anderen Weg").
2. "sentenceStart" ist alles VOR der Lücke. Wenn die Lücke am Satzanfang steht, ist "sentenceStart" leer ("").
   - "sentenceStart" darf NIEMALS mit einer Präpositional-Verschmelzung (im, am, zum, vom, beim, ins, ans) enden! Benutze stattdessen offene Präpositionen wie "In ", "Vor ", "An ", "Zu ", "Bei ".
   - "sentenceStart" darf NIEMALS einen Artikel doppeln.
   - "sentenceStart" MUSS mit einem Leerzeichen enden, falls es nicht leer ist!
3. "sentenceEnd" ist alles NACH der Lücke.
4. "fullSentence" MUSS EXAKT GLEICH "sentenceStart" + "targetAnswer" + "sentenceEnd" sein!
5. Groß-/Kleinschreibung:
   - Beginnt der Satz mit der Lücke ("sentenceStart": ""), muss der erste Buchstabe von "targetAnswer" GROSS sein ("${requests[0]?.requiredTarget ? requests[0].requiredTarget.charAt(0).toUpperCase() + requests[0].requiredTarget.slice(1) : 'Die Sonne'}").
   - Steht die Lücke im Satz, ist das Begleitwort klein.
6. Grammatische Natürlichkeit & Auslöser:
   - Dativ erfordert ein Dativ-Verb (z.B. helfen, gefallen, danken, gehören) oder eine Dativ-Präposition (in, vor, an, auf, mit, bei, von, zu). Niemals "gehen + Dativ" ohne Präposition!
   - Akkusativ erfordert ein transitives Verb (sehen, kaufen, suchen, besuchen, haben) oder Akkusativ-Präposition (für, ohne, um, durch).
   - Nominativ ist das Subjekt des Satzes.
7. Beachte n-Deklination bei schwachen maskulinen Nomen (z.B. der Junge -> dem Jungen; der Kollege -> dem Kollegen; der Kunde -> den Kunden; der Name -> dem Namen).

Aufgabenliste:
${requests.map((r, i) => `${i + 1}. Wort-ID: ${r.wordId}, Nomen: ${r.baseNoun} (${r.gender}), Fall: ${r.case}, Muster: ${r.determinerGroup}, Erwartetes Ziel: "${r.requiredTarget}"`).join('\n')}

Gib ausschließlich ein JSON-Array zurück:
[
  {
    "baseNoun": "...",
    "gender": "m",
    "case": "dativ",
    "sentenceStart": "...",
    "targetAnswer": "...",
    "sentenceEnd": "...",
    "fullSentence": "...",
    "translation": "English translation here",
    "ruleExplanation": "Kurze Grammatikerklärung auf Deutsch"
  }
]
`;

  if (!OPENROUTER_KEY) {
    throw new Error('OPENROUTER_API_KEY fehlt! Bitte setze die Umgebungsvariable oder übergib --api-key <schlüssel>.');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'Du antwortest ausschließlich mit gültigem JSON ohne Markdown-Codeblöcke.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 6000
    }),
    signal: AbortSignal.timeout(90000)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter Error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const rawText = choice?.message?.content?.trim() || '';
  const startIdx = rawText.indexOf('[');
  const endIdx = rawText.lastIndexOf(']');
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`Ungültige Modell-Antwort (finish: ${choice?.finish_reason}, len: ${rawText.length}): ${rawText.slice(0, 150)}`);
  }
  const cleanJson = rawText.slice(startIdx, endIdx + 1);
  const parsed = JSON.parse(cleanJson);

  return parsed.map((item, i) => {
    let req = requests.find(r => r.wordId === item.wordId && r.case === item.case);
    if (!req) req = requests[i] || {};

    const noun = item.baseNoun || req.baseNoun;
    const gender = item.gender || req.gender;
    const c = item.case || req.case;
    const detGroup = req.determinerGroup || 'def';
    const detHint = req.determinerHint || '(der, die, das)';

    let sentenceStart = item.sentenceStart !== undefined ? item.sentenceStart : '';
    let targetAnswer = item.targetAnswer ? item.targetAnswer.trim() : (req.requiredTarget || noun);
    let sentenceEnd = item.sentenceEnd !== undefined ? item.sentenceEnd : '';
    let fullSentence = (item.fullSentence || '').trim();

    if (fullSentence) {
      const escaped = targetAnswer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const targetRegex = new RegExp(escaped, 'i');
      const match = fullSentence.match(targetRegex);
      if (match && match.index !== undefined) {
        sentenceStart = fullSentence.slice(0, match.index);
        targetAnswer = match[0];
        sentenceEnd = fullSentence.slice(match.index + match[0].length);
      }
    }

    if (sentenceStart && !sentenceStart.endsWith(' ')) {
      sentenceStart += ' ';
    }
    if (sentenceEnd && !sentenceEnd.startsWith(' ') && !/^[.,!?;:]/.test(sentenceEnd)) {
      sentenceEnd = ' ' + sentenceEnd;
    }
    fullSentence = `${sentenceStart}${targetAnswer}${sentenceEnd}`;

    const accepted = new Set();
    accepted.add(targetAnswer.toLowerCase());
    accepted.add(noun.toLowerCase());

    return {
      id: `ex_${req.wordId || i}_${c}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      wordId: req.wordId || item.wordId,
      baseNoun: noun,
      originalWord: req.originalWord || `der ${noun}`,
      gender,
      case: c,
      determinerGroup: detGroup,
      determinerHint: detHint,
      sentenceStart,
      targetAnswer,
      sentenceEnd,
      acceptedAnswers: Array.from(accepted),
      fullSentence,
      translation: item.translation || '',
      ruleExplanation: item.ruleExplanation || `${c}-Form von ${noun}`,
      category: req.tier || 'top4000'
    };
  });
}

function saveAtomically(filePath, data) {
  const tmpPath = `${filePath}.tmp_${Date.now()}`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

// 5. Main Execution Orchestrator
async function main() {
  console.log('--- Start Top-4000 Dataset Generation & Ordering ---');
  if (!OPENROUTER_KEY) {
    console.error('FEHLER: Kein OpenRouter API-Schlüssel gefunden!');
    console.error('Bitte übergib den Schlüssel mit:');
    console.error('  OPENROUTER_API_KEY="sk-or-..." node scripts/generate_top4000_cases.mjs');
    console.error('  oder: node scripts/generate_top4000_cases.mjs --api-key="sk-or-..."');
    process.exit(1);
  }

  const allNouns = getAllNounsFromSqlite();
  console.log(`Total Top-4000 Nouns in SQLite: ${allNouns.length}`);

  const tierCounts = {};
  for (const n of allNouns) {
    tierCounts[n.tier] = (tierCounts[n.tier] || 0) + 1;
  }
  console.log('Tier distribution:', tierCounts);

  // Map of wordId -> Array of exercises
  const wordExercisesMap = new Map();

  // 1. Load existing Top-1000 dataset (348 words x 3 cases = 1044 exercises)
  if (fs.existsSync(TOP1000_PATH)) {
    const top1000Data = JSON.parse(fs.readFileSync(TOP1000_PATH, 'utf8'));
    console.log(`Geladene Top-1000 Vorlage: ${top1000Data.length} Sätze.`);
    for (const item of top1000Data) {
      item.category = 'top1000';
      if (!wordExercisesMap.has(item.wordId)) {
        wordExercisesMap.set(item.wordId, []);
      }
      wordExercisesMap.get(item.wordId).push(item);
    }
  }

  // 2. Load existing top4000_cases.json if present
  if (fs.existsSync(OUTPUT_PATH)) {
    try {
      const existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
      for (const item of existing) {
        if (!wordExercisesMap.has(item.wordId)) {
          wordExercisesMap.set(item.wordId, []);
        }
        // Avoid duplicate cases for the same word
        const currentList = wordExercisesMap.get(item.wordId);
        if (!currentList.some(ex => ex.case === item.case)) {
          currentList.push(item);
        }
      }
    } catch (e) {
      console.warn('Konnte bestehende top4000_cases.json nicht parsen:', e.message);
    }
  }

  // 3. Check completeness: A word is complete if it has all 3 cases: nominativ, akkusativ, dativ
  const REQUIRED_CASES = ['nominativ', 'akkusativ', 'dativ'];
  let completeCount = 0;
  const remainingNouns = [];

  for (const noun of allNouns) {
    const exercises = wordExercisesMap.get(noun.id) || [];
    const cases = new Set(exercises.map(e => e.case));
    const isComplete = REQUIRED_CASES.every(c => cases.has(c));

    if (isComplete) {
      completeCount++;
    } else {
      remainingNouns.push(noun);
    }
  }

  console.log(`Bereits vollständige Nomen (alle 3 Fälle): ${completeCount}/${allNouns.length}`);
  console.log(`Noch zu vervollständigende / generierende Nomen: ${remainingNouns.length}`);

  if (remainingNouns.length === 0) {
    console.log('Alle Nomen sind bereits vollständig mit 3 Fällen abgedeckt!');
  } else {
    const BATCH_SIZE = 1; // 1 noun * 3 sentences = 3 sentences per batch (100% reliable, zero early stops)
    const batches = [];
    for (let i = 0; i < remainingNouns.length; i += BATCH_SIZE) {
      batches.push(remainingNouns.slice(i, i + BATCH_SIZE));
    }
    console.log(`Aufgeteilt in ${batches.length} Batches.`);

    const CONCURRENCY = 4;
    for (let b = 0; b < batches.length; b += CONCURRENCY) {
      const chunk = batches.slice(b, b + CONCURRENCY);
      const promises = chunk.map(async (batch, subIdx) => {
        const batchIdx = b + subIdx + 1;
        let success = false;
        let retries = 0;
        while (!success && retries < 5) {
          try {
            const results = await generateBatch(batch, batchIdx);
            success = true;
            return results;
          } catch (err) {
            retries++;
            console.error(`  ✗ Fehler in Batch ${batchIdx} (Versuch ${retries}):`, err.message);
            await new Promise(res => setTimeout(res, 1500 * retries));
          }
        }
        console.warn(`  ⚠️ Batch ${batchIdx} nach 5 Versuchen übersprungen – wird im nächsten Durchlauf versucht.`);
        return [];
      });

      const resultsArray = await Promise.all(promises);
      for (const res of resultsArray) {
        for (const item of res) {
          if (!wordExercisesMap.has(item.wordId)) {
            wordExercisesMap.set(item.wordId, []);
          }
          const list = wordExercisesMap.get(item.wordId);
          // Replace or append
          const existingIdx = list.findIndex(ex => ex.case === item.case);
          if (existingIdx >= 0) {
            list[existingIdx] = item;
          } else {
            list.push(item);
          }
        }
      }

      // Assemble current dataset
      const currentList = [];
      for (const list of wordExercisesMap.values()) {
        currentList.push(...list);
      }

      const currentBatchNum = Math.min(b + CONCURRENCY, batches.length);
      console.log(`  ✓ Fortschritt: ${currentBatchNum}/${batches.length} Batches abgeschlossen. Gesamt: ${currentList.length} Sätze.`);

      // Save atomically
      const cleaned = cleanExercises(currentList);
      saveAtomically(OUTPUT_PATH, cleaned);

      await new Promise(res => setTimeout(res, 800));
    }
  }

  // Final sorting: strictly Top 1000 first, then Top 2000, then Top 3000, then Top 4000
  const tierWeight = { top1000: 1, top2000: 2, top3000: 3, top4000: 4 };
  const caseWeight = { nominativ: 1, akkusativ: 2, dativ: 3, genitiv: 4 };

  const allExercises = [];
  for (const list of wordExercisesMap.values()) {
    allExercises.push(...list);
  }

  const finalSorted = cleanExercises(allExercises).sort((a, b) => {
    const tA = tierWeight[a.category] || 99;
    const tB = tierWeight[b.category] || 99;
    if (tA !== tB) return tA - tB;

    if (a.wordId !== b.wordId) return (a.wordId || 0) - (b.wordId || 0);

    const cA = caseWeight[a.case] || 99;
    const cB = caseWeight[b.case] || 99;
    return cA - cB;
  });

  saveAtomically(OUTPUT_PATH, finalSorted);

  console.log(`\n🎉 Top-4000 Satzgenerierung vollständig abgeschlossen!`);
  console.log(`Insgesamt ${finalSorted.length} Sätze generiert und nach Frequenz-Stufen geordnet.`);
  console.log(`Gespeichert in: ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error('Fataler Fehler:', err);
  process.exit(1);
});

