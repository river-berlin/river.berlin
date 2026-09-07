import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT_DIR, 'reword_de-new.backup');
const OUTPUT_PATH = path.join(ROOT_DIR, 'app/src/routes/projects/german-cases-trainer/data/top1000_cases.json');

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY || '';
const MODEL = 'google/gemini-2.5-flash';

// 1. Extract Nouns from SQLite database
function getNounsFromSqlite() {
  const query = `
    SELECT w.ID as id, w.WORD as word, w.ENG as meaning
    FROM WORD w 
    JOIN WORD_CATEGORY wc ON w.ID = wc.WORD_ID 
    WHERE wc.CATEGORY_ID = 'top1000' AND w.POS = 1 
    ORDER BY w.ID ASC;
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

// 3. Batch generator
async function generateBatch(nounsBatch, batchIdx) {
  // Assign cases and natural determiner groups to each noun
  // Unique celestial / geographic entities stay primarily definite
  const UNIQUE_NOUNS = ['Sonne', 'Erde', 'Mond', 'Himmel', 'Welt'];

  const requests = [];
  nounsBatch.forEach((n, idx) => {
    const { baseNoun, gender } = parseNounInfo(n.word);
    const isUnique = UNIQUE_NOUNS.includes(baseNoun);

    // 3 cases for each noun: nominativ, akkusativ, dativ
    const gNom = isUnique ? 'def' : DETERMINER_GROUPS[(batchIdx * 3 + idx) % DETERMINER_GROUPS.length];
    const gAkk = isUnique ? 'def' : DETERMINER_GROUPS[(batchIdx * 3 + idx + 2) % DETERMINER_GROUPS.length];
    const gDat = isUnique ? 'def' : DETERMINER_GROUPS[(batchIdx * 3 + idx + 4) % DETERMINER_GROUPS.length];

    requests.push({ wordId: n.id, originalWord: n.word, baseNoun, gender, case: 'nominativ', determinerGroup: gNom });
    requests.push({ wordId: n.id, originalWord: n.word, baseNoun, gender, case: 'akkusativ', determinerGroup: gAkk });
    requests.push({ wordId: n.id, originalWord: n.word, baseNoun, gender, case: 'dativ', determinerGroup: gDat });
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
5. Beachte n-Deklination bei schwachen maskulinen Nomen (z.B. der Junge -> dem Jungen / einem solchen Jungen / keinen Jungen; der Kollege -> dem Kollegen).

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
      temperature: 0.2
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

  // Validate and post-process
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

    // Guarantee fullSentence consistency
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
      category: 'top1000'
    };
  });
}

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

async function main() {
  console.log('Starte natürliche Satz-Generierung mit Gemini...');
  const nouns = getNounsFromSqlite();
  console.log(`Gefundene Top-1000 Nomen: ${nouns.length}`);

  const BATCH_SIZE = 12; // ~36 sentences per batch
  const allGenerated = [];

  for (let i = 0; i < nouns.length; i += BATCH_SIZE) {
    const batch = nouns.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(nouns.length / BATCH_SIZE);

    console.log(`Generiere Batch ${batchNum}/${totalBatches} (${batch.length} Nomen)...`);

    let success = false;
    let retries = 0;

    while (!success && retries < 3) {
      try {
        const results = await generateBatch(batch, batchNum);
        allGenerated.push(...results);
        console.log(`  ✓ Batch ${batchNum} erfolgreich (${results.length} Sätze). Gesamt: ${allGenerated.length}`);
        success = true;
        // Clean and save intermediate progress
        const cleaned = cleanExercises(allGenerated);
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(cleaned, null, 2), 'utf8');
      } catch (err) {
        retries++;
        console.error(`  ✗ Fehler in Batch ${batchNum} (Versuch ${retries}):`, err.message);
        await new Promise(res => setTimeout(res, 2000 * retries));
      }
    }

    // Small delay to be polite to rate limits
    await new Promise(res => setTimeout(res, 800));
  }

  console.log(`\n🎉 Fertig! Insgesamt ${allGenerated.length} natürliche Beispielsätze generiert.`);
  console.log(`Gespeichert in: ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error('Fataler Fehler:', err);
  process.exit(1);
});
