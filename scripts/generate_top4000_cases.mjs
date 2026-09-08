import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT_DIR, 'reword_de-new.backup');
const TOP1000_PATH = path.join(ROOT_DIR, 'app/src/routes/projects/german-cases-trainer/data/top1000_cases.json');
const OUTPUT_PATH = path.join(ROOT_DIR, 'app/src/routes/projects/german-cases-trainer/data/top4000_cases.json');

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY || '';
const MODEL = 'google/gemini-2.5-flash';

// 1. Extract Nouns from SQLite database with their respective tier
function getAllNounsFromSqlite() {
  const query = `
    SELECT 
      w.ID as id, 
      w.WORD as word, 
      w.ENG as meaning,
      CASE 
        WHEN w1 IS NOT NULL THEN 'top1000'
        WHEN w2 IS NOT NULL THEN 'top2000'
        WHEN w3 IS NOT NULL THEN 'top3000'
        ELSE 'top4000'
      END as tier
    FROM (
      SELECT 
        w.ID,
        w.WORD,
        w.ENG,
        wc1.WORD_ID as w1,
        wc2.WORD_ID as w2,
        wc3.WORD_ID as w3
      FROM WORD w
      JOIN WORD_CATEGORY wc ON w.ID = wc.WORD_ID AND wc.CATEGORY_ID = 'top4000'
      LEFT JOIN WORD_CATEGORY wc1 ON w.ID = wc1.WORD_ID AND wc1.CATEGORY_ID = 'top1000'
      LEFT JOIN WORD_CATEGORY wc2 ON w.ID = wc2.WORD_ID AND wc2.CATEGORY_ID = 'top2000'
      LEFT JOIN WORD_CATEGORY wc3 ON w.ID = wc3.WORD_ID AND wc3.CATEGORY_ID = 'top3000'
      WHERE w.POS = 1
      GROUP BY w.ID
    ) w
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
  const words = clean.split(/[\s(]/);
  return { article: '', baseNoun: words[0], gender: 'n' };
}

const DETERMINER_HINTS = {
  def: '(der, die, das, dem, den, des)',
  indef: '(ein, einem, einer, eines)',
  poss: '(mein, meiner, meinem, meine)',
  dies: '(dieser, diese, diesem, diesen)',
  solch: '(solche, solcher, solches, solchem)',
  ander: '(andere, anderer, anderes, anderem)',
  kein: '(kein, keine, keinem, keiner)'
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

    requests.push({ wordId: n.id, originalWord: n.word, baseNoun, gender, case: 'nominativ', determinerGroup: gNom, tier: n.tier });
    requests.push({ wordId: n.id, originalWord: n.word, baseNoun, gender, case: 'akkusativ', determinerGroup: gAkk, tier: n.tier });
    requests.push({ wordId: n.id, originalWord: n.word, baseNoun, gender, case: 'dativ', determinerGroup: gDat, tier: n.tier });
  });

  const prompt = `
Du bist ein renommierter deutscher Sprachwissenschaftler und Didaktiker.
Deine Aufgabe ist es, für die folgenden deutschen Nomen im geforderten Kasus und mit dem geforderten Begleitwort-Muster jeweils EINEN 100% NATÜRLICHEN, authentischen Alltags-Übungssatz zu erstellen.

WICHTIGE GRAMMATISCHE REGELN:
1. "targetAnswer" MUSS das Nomen mit dem geforderten Begleitwort im geforderten Kasus sein (z.B. "einem solchen Raum", "keine Zeit", "meinem Freund", "einen anderen Weg", "das Buch", "diesem Kind").
2. "fullSentence" MUSS EXAKT GLEICH "sentenceStart" + "targetAnswer" + "sentenceEnd" sein!
3. "sentenceStart" darf NIEMALS mit einer Präpositional-Verschmelzung (im, am, zum, vom, beim) enden, wenn "targetAnswer" mit einem Artikel beginnt! 
   FALSCH: "In dem " + "einem solchen Raum" (doppelt!)
   FALSCH: "Im " + "einem solchen Raum" (doppelt!)
   RICHTIG: "In " + "einem solchen Raum" + " kann man sich gut konzentrieren."
   RICHTIG: "Leider habe ich " + "keine Zeit" + " für dieses Thema."
4. Groß-/Kleinschreibung:
   - Beginnt der Satz mit der Lücke ("sentenceStart": ""), muss der erste Buchstabe von "targetAnswer" GROSS sein ("Die Sonne", "Ein solches Buch", "Kein Junge").
   - Steht die Lücke im Satz, ist das Begleitwort klein ("einem solchen Raum", "keine Zeit").
5. Beachte n-Deklination bei schwachen maskulinen Nomen (z.B. der Junge -> dem Jungen / einem solchen Jungen / keinen Jungen; der Kollege -> dem Kollegen; der Name -> dem Namen).

Aufgabenliste:
${requests.map((r, i) => `${i + 1}. Wort-ID: ${r.wordId}, Nomen: ${r.baseNoun} (${r.gender}), Kasus: ${r.case}, Muster: ${r.determinerGroup}`).join('\n')}

Gib NUR ein JSON-Array zurück:
[
  {
    "wordId": 123,
    "baseNoun": "...",
    "gender": "m",
    "case": "dativ",
    "determinerGroup": "...",
    "determinerHint": "...",
    "sentenceStart": "...",
    "targetAnswer": "...",
    "sentenceEnd": "...",
    "fullSentence": "...",
    "translation": "English translation here",
    "ruleExplanation": "Kurze Grammatikerklärung auf Deutsch"
  }
]
`;

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
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter Error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const rawText = data.choices[0].message.content.trim();
  const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
  const parsed = JSON.parse(cleanJson);

  return parsed.map((item, i) => {
    const req = requests[i] || {};
    const noun = item.baseNoun || req.baseNoun;
    const gender = item.gender || req.gender;
    const c = item.case || req.case;
    const detGroup = item.determinerGroup || req.determinerGroup;
    const detHint = DETERMINER_HINTS[detGroup] || '(der, die, das)';

    let sentenceStart = item.sentenceStart !== undefined ? item.sentenceStart : '';
    let targetAnswer = item.targetAnswer ? item.targetAnswer.trim() : '';
    let sentenceEnd = item.sentenceEnd !== undefined ? item.sentenceEnd : '';

    let fullSentence = item.fullSentence || `${sentenceStart}${targetAnswer}${sentenceEnd}`;
    if (fullSentence !== sentenceStart + targetAnswer + sentenceEnd) {
      fullSentence = `${sentenceStart}${targetAnswer}${sentenceEnd}`;
    }

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

// 5. Main Execution Orchestrator
async function main() {
  console.log('--- Start Top-4000 Dataset Generation & Ordering ---');
  const allNouns = getAllNounsFromSqlite();
  console.log(`Total Top-4000 Nouns in SQLite: ${allNouns.length}`);

  const tierCounts = {};
  for (const n of allNouns) {
    tierCounts[n.tier] = (tierCounts[n.tier] || 0) + 1;
  }
  console.log('Tier distribution:', tierCounts);

  // Load existing Top-1000 dataset as base
  let masterDataset = [];
  const processedWordIds = new Set();

  if (fs.existsSync(TOP1000_PATH)) {
    const top1000Data = JSON.parse(fs.readFileSync(TOP1000_PATH, 'utf8'));
    console.log(`Geladene Top-1000 Vorlage: ${top1000Data.length} Sätze.`);
    for (const item of top1000Data) {
      item.category = 'top1000'; // Ensure exact tag
      masterDataset.push(item);
      processedWordIds.add(item.wordId);
    }
  }

  // Also check if top4000_cases.json already has partial progress
  if (fs.existsSync(OUTPUT_PATH)) {
    try {
      const partial = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
      for (const item of partial) {
        masterDataset.push(item);
        processedWordIds.add(item.wordId);
      }
      console.log(`Bereits verarbeitete Nomen insgesamt: ${processedWordIds.size}/${allNouns.length}`);
    } catch (e) {}
  }

  // Count how many sentences each word already has (target: 3 sentences per word)
  const sentencesPerWord = new Map();
  for (const item of masterDataset) {
    sentencesPerWord.set(item.wordId, (sentencesPerWord.get(item.wordId) || 0) + 1);
  }

  const remainingNouns = allNouns.filter(n => (sentencesPerWord.get(n.id) || 0) < 3);
  console.log(`Noch zu generierende Nomen: ${remainingNouns.length}`);

  const BATCH_SIZE = 8; // 8 nouns * 3 sentences = 24 sentences per batch
  const batches = [];
  for (let i = 0; i < remainingNouns.length; i += BATCH_SIZE) {
    batches.push(remainingNouns.slice(i, i + BATCH_SIZE));
  }
  console.log(`Aufgeteilt in ${batches.length} Batches.`);

  // Process batches with controlled concurrency (6 parallel requests)
  const CONCURRENCY = 6;
  for (let b = 0; b < batches.length; b += CONCURRENCY) {
    const chunk = batches.slice(b, b + CONCURRENCY);
    const promises = chunk.map(async (batch, subIdx) => {
      const batchIdx = b + subIdx + 1;
      let success = false;
      let retries = 0;
      while (!success && retries < 4) {
        try {
          const results = await generateBatch(batch, batchIdx);
          success = true;
          return results;
        } catch (err) {
          retries++;
          console.error(`  ✗ Fehler in Batch ${batchIdx} (Versuch ${retries}):`, err.message);
          await new Promise(res => setTimeout(res, 2500 * retries));
        }
      }
      throw new Error(`Batch ${batchIdx} nach ${retries} Versuchen fehlgeschlagen!`);
    });

    const resultsArray = await Promise.all(promises);
    for (const res of resultsArray) {
      masterDataset.push(...res);
    }

    const currentBatchNum = Math.min(b + CONCURRENCY, batches.length);
    console.log(`  ✓ Fortschritt: ${currentBatchNum}/${batches.length} Batches abgeschlossen. Gesamt: ${masterDataset.length} Sätze.`);

    // Periodically save cleaned intermediate progress
    const cleaned = cleanExercises(masterDataset);
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(cleaned, null, 2), 'utf8');

    // Politeness sleep
    await new Promise(res => setTimeout(res, 800));
  }

  // Final sorting: strictly Top 1000 first, then Top 2000, then Top 3000, then Top 4000
  const tierWeight = { top1000: 1, top2000: 2, top3000: 3, top4000: 4 };
  const caseWeight = { nominativ: 1, akkusativ: 2, dativ: 3, genitiv: 4 };

  const finalSorted = cleanExercises(masterDataset).sort((a, b) => {
    const tA = tierWeight[a.category] || 99;
    const tB = tierWeight[b.category] || 99;
    if (tA !== tB) return tA - tB;

    if (a.wordId !== b.wordId) return (a.wordId || 0) - (b.wordId || 0);

    const cA = caseWeight[a.case] || 99;
    const cB = caseWeight[b.case] || 99;
    return cA - cB;
  });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalSorted, null, 2), 'utf8');

  console.log(`\n🎉 Top-4000 Satzgenerierung vollständig abgeschlossen!`);
  console.log(`Insgesamt ${finalSorted.length} Sätze generiert und nach Frequenz-Stufen geordnet.`);
  console.log(`Gespeichert in: ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error('Fataler Fehler:', err);
  process.exit(1);
});
