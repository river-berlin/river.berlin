import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_FILE = path.join(ROOT_DIR, 'app/src/routes/projects/german-cases-trainer/data/top1000_cases.json');

const DETERMINERS = {
  def: {
    id: 'def',
    label: 'bestimmt',
    hint: '(der, die, das, dem, den, des)',
    decl: {
      m: { nominativ: 'der', akkusativ: 'den', dativ: 'dem', genitiv: 'des' },
      f: { nominativ: 'die', akkusativ: 'die', dativ: 'der', genitiv: 'der' },
      n: { nominativ: 'das', akkusativ: 'das', dativ: 'dem', genitiv: 'des' }
    }
  },
  indef: {
    id: 'indef',
    label: 'unbestimmt',
    hint: '(ein, einem, einer, eines)',
    decl: {
      m: { nominativ: 'ein', akkusativ: 'einen', dativ: 'einem', genitiv: 'eines' },
      f: { nominativ: 'eine', akkusativ: 'eine', dativ: 'einer', genitiv: 'einer' },
      n: { nominativ: 'ein', akkusativ: 'ein', dativ: 'einem', genitiv: 'eines' }
    }
  },
  poss: {
    id: 'poss',
    label: 'possessiv',
    hint: '(mein, meiner, meinem, meine)',
    decl: {
      m: { nominativ: 'mein', akkusativ: 'meinen', dativ: 'meinem', genitiv: 'meines' },
      f: { nominativ: 'meine', akkusativ: 'meine', dativ: 'meiner', genitiv: 'meiner' },
      n: { nominativ: 'mein', akkusativ: 'mein', dativ: 'meinem', genitiv: 'meines' }
    }
  },
  dies: {
    id: 'dies',
    label: 'demonstrativ',
    hint: '(dieser, diese, diesem, diesen)',
    decl: {
      m: { nominativ: 'dieser', akkusativ: 'diesen', dativ: 'diesem', genitiv: 'dieses' },
      f: { nominativ: 'diese', akkusativ: 'diese', dativ: 'dieser', genitiv: 'dieser' },
      n: { nominativ: 'dieses', akkusativ: 'dieses', dativ: 'diesem', genitiv: 'dieses' }
    }
  },
  solch: {
    id: 'solch',
    label: 'solch-',
    hint: '(solche, solcher, solches, solchem)',
    decl: {
      m: { nominativ: 'ein solcher', akkusativ: 'einen solchen', dativ: 'einem solchen', genitiv: 'eines solchen' },
      f: { nominativ: 'eine solche', akkusativ: 'eine solche', dativ: 'einer solchen', genitiv: 'einer solchen' },
      n: { nominativ: 'ein solches', akkusativ: 'ein solches', dativ: 'einem solchen', genitiv: 'eines solchen' }
    },
    alts: {
      m: { nominativ: 'solcher', akkusativ: 'solchen', dativ: 'solchem', genitiv: 'solchen' },
      f: { nominativ: 'solche', akkusativ: 'solche', dativ: 'solcher', genitiv: 'solcher' },
      n: { nominativ: 'solches', akkusativ: 'solches', dativ: 'solchem', genitiv: 'solchen' }
    }
  },
  ander: {
    id: 'ander',
    label: 'ander-',
    hint: '(andere, anderer, anderes, anderem)',
    decl: {
      m: { nominativ: 'ein anderer', akkusativ: 'einen anderen', dativ: 'einem anderen', genitiv: 'eines anderen' },
      f: { nominativ: 'eine andere', akkusativ: 'eine andere', dativ: 'einer anderen', genitiv: 'einer anderen' },
      n: { nominativ: 'ein anderes', akkusativ: 'ein anderes', dativ: 'einem anderen', genitiv: 'eines anderen' }
    },
    alts: {
      m: { nominativ: 'anderer', akkusativ: 'anderen', dativ: 'anderem', genitiv: 'anderen' },
      f: { nominativ: 'andere', akkusativ: 'andere', dativ: 'anderer', genitiv: 'anderer' },
      n: { nominativ: 'anderes', akkusativ: 'anderes', dativ: 'anderem', genitiv: 'anderen' }
    }
  },
  kein: {
    id: 'kein',
    label: 'negativ',
    hint: '(kein, keine, keinem, keiner)',
    decl: {
      m: { nominativ: 'kein', akkusativ: 'keinen', dativ: 'keinem', genitiv: 'keines' },
      f: { nominativ: 'keine', akkusativ: 'keine', dativ: 'keiner', genitiv: 'keiner' },
      n: { nominativ: 'kein', akkusativ: 'kein', dativ: 'keinem', genitiv: 'keines' }
    }
  }
};

const GROUPS = ['def', 'indef', 'poss', 'dies', 'solch', 'ander', 'kein'];

function run() {
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const exercises = JSON.parse(raw);
  console.log(`Original exercises: ${exercises.length}`);

  // Group by wordId
  const byWord = new Map();
  for (const ex of exercises) {
    if (!byWord.has(ex.wordId)) {
      byWord.set(ex.wordId, []);
    }
    byWord.get(ex.wordId).push(ex);
  }

  let wordIndex = 0;
  const enrichedExercises = [];

  for (const [wordId, list] of byWord.entries()) {
    // Select a rotating primary and secondary determiner group for this word
    const g1 = GROUPS[wordIndex % GROUPS.length];
    const g2 = GROUPS[(wordIndex + 2) % GROUPS.length];
    const g3 = GROUPS[(wordIndex + 4) % GROUPS.length];
    const wordGroups = [g1, g2, g3, 'def', 'indef'];

    list.forEach((ex, i) => {
      const chosenGroupKey = wordGroups[i % wordGroups.length];
      const det = DETERMINERS[chosenGroupKey];
      const gender = ['m', 'f', 'n'].includes(ex.gender) ? ex.gender : 'm';
      const c = ['nominativ', 'akkusativ', 'dativ', 'genitiv'].includes(ex.case) ? ex.case : 'nominativ';

      const art = det.decl[gender]?.[c] || 'der';
      const altArt = det.alts?.[gender]?.[c];

      const isSentenceStart = !ex.sentenceStart || ex.sentenceStart.trim().length === 0;

      // Format target answer with correct casing
      const formatArt = (str) => {
        if (!isSentenceStart) return str.toLowerCase();
        return str.charAt(0).toUpperCase() + str.slice(1);
      };

      const finalArt = formatArt(art);
      const noun = ex.baseNoun || ex.targetAnswer.split(' ').pop();
      const targetAnswer = `${finalArt} ${noun}`;

      // Build accepted answers
      const accepted = new Set();
      accepted.add(targetAnswer.toLowerCase());
      accepted.add(`${art} ${noun}`.toLowerCase());

      if (altArt) {
        const altTarget = `${formatArt(altArt)} ${noun}`;
        accepted.add(altTarget.toLowerCase());
        accepted.add(`${altArt} ${noun}`.toLowerCase());
      }

      // Also accept base target answer without article in case of forgiving match
      accepted.add(noun.toLowerCase());

      // Guarantee sentenceEnd exists and fullSentence matches exactly
      let sentenceStart = ex.sentenceStart || '';
      let sentenceEnd = ex.sentenceEnd !== undefined ? ex.sentenceEnd : '';

      // Clean up punctuation if sentenceEnd was missing
      if (!sentenceEnd && ex.fullSentence && ex.fullSentence.endsWith('.')) {
        sentenceEnd = '.';
      }

      const fullSentence = `${sentenceStart}${targetAnswer}${sentenceEnd}`;

      enrichedExercises.push({
        ...ex,
        baseNoun: noun,
        determinerGroup: chosenGroupKey,
        determinerHint: det.hint,
        sentenceStart,
        sentenceEnd,
        targetAnswer,
        acceptedAnswers: Array.from(accepted),
        fullSentence
      });
    });

    wordIndex++;
  }

  // Verification pass
  let mismatches = 0;
  for (const ex of enrichedExercises) {
    if (ex.sentenceStart + ex.targetAnswer + ex.sentenceEnd !== ex.fullSentence) {
      mismatches++;
    }
  }

  console.log(`Enriched exercises: ${enrichedExercises.length}`);
  console.log(`Mismatches: ${mismatches}`);

  // Count distribution across determiner groups
  const dist = {};
  for (const ex of enrichedExercises) {
    dist[ex.determinerGroup] = (dist[ex.determinerGroup] || 0) + 1;
  }
  console.log('Determiner distribution:', dist);

  fs.writeFileSync(DATA_FILE, JSON.stringify(enrichedExercises, null, 2), 'utf8');
  console.log('Saved enriched dataset to', DATA_FILE);
}

run();
