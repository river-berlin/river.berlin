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

const DETERMINERS = {
  def: {
    label: 'der/die/das',
    hint: 'der/die/das (der, die, das, den, dem, des)',
    decl: {
      m: { nominativ: 'der', akkusativ: 'den', dativ: 'dem', genitiv: 'des' },
      f: { nominativ: 'die', akkusativ: 'die', dativ: 'der', genitiv: 'der' },
      n: { nominativ: 'das', akkusativ: 'das', dativ: 'dem', genitiv: 'des' }
    }
  },
  indef: {
    label: 'ein-',
    hint: 'ein- (ein, eine, einen, einem, einer, eines)',
    decl: {
      m: { nominativ: 'ein', akkusativ: 'einen', dativ: 'einem', genitiv: 'eines' },
      f: { nominativ: 'eine', akkusativ: 'eine', dativ: 'einer', genitiv: 'einer' },
      n: { nominativ: 'ein', akkusativ: 'ein', dativ: 'einem', genitiv: 'eines' }
    }
  },
  poss: {
    label: 'mein-',
    hint: 'mein- (mein, meine, meinen, meinem, meiner)',
    decl: {
      m: { nominativ: 'mein', akkusativ: 'meinen', dativ: 'meinem', genitiv: 'meines' },
      f: { nominativ: 'meine', akkusativ: 'meine', dativ: 'meiner', genitiv: 'meiner' },
      n: { nominativ: 'mein', akkusativ: 'mein', dativ: 'meinem', genitiv: 'meines' }
    }
  },
  dies: {
    label: 'dies-',
    hint: 'dies- (dieser, diese, dieses, diesen, diesem)',
    decl: {
      m: { nominativ: 'dieser', akkusativ: 'diesen', dativ: 'diesem', genitiv: 'dieses' },
      f: { nominativ: 'diese', akkusativ: 'diese', dativ: 'dieser', genitiv: 'dieser' },
      n: { nominativ: 'dieses', akkusativ: 'dieses', dativ: 'diesem', genitiv: 'dieses' }
    }
  },
  solch: {
    label: 'ein solcher',
    hint: 'ein solcher (ein solcher, eine solche, einen solchen...)',
    decl: {
      m: { nominativ: 'ein solcher', akkusativ: 'einen solchen', dativ: 'einem solchen', genitiv: 'eines solchen' },
      f: { nominativ: 'eine solche', akkusativ: 'eine solche', dativ: 'einer solchen', genitiv: 'einer solchen' },
      n: { nominativ: 'ein solches', akkusativ: 'ein solches', dativ: 'einem solchen', genitiv: 'eines solchen' }
    }
  },
  ander: {
    label: 'ein anderer',
    hint: 'ein anderer (ein anderer, eine andere, einen anderen...)',
    decl: {
      m: { nominativ: 'ein anderer', akkusativ: 'einen anderen', dativ: 'einem anderen', genitiv: 'eines anderen' },
      f: { nominativ: 'eine andere', akkusativ: 'eine andere', dativ: 'einer anderen', genitiv: 'einer anderen' },
      n: { nominativ: 'ein anderes', akkusativ: 'ein anderes', dativ: 'einem anderen', genitiv: 'eines anderen' }
    }
  },
  kein: {
    label: 'kein-',
    hint: 'kein- (kein, keine, keinen, keinem, keiner)',
    decl: {
      m: { nominativ: 'kein', akkusativ: 'keinen', dativ: 'keinem', genitiv: 'keines' },
      f: { nominativ: 'keine', akkusativ: 'keine', dativ: 'keiner', genitiv: 'keiner' },
      n: { nominativ: 'kein', akkusativ: 'kein', dativ: 'keinem', genitiv: 'keines' }
    }
  }
};

const GROUPS = ['def', 'indef', 'poss', 'dies', 'solch', 'ander', 'kein'];
const UNIQUE_NOUNS = ['Sonne', 'Erde', 'Mond', 'Himmel', 'Welt'];

async function generateBatch(nounsBatch, batchIdx) {
  const requests = [];

  nounsBatch.forEach((n, idx) => {
    const { baseNoun, gender } = parseNounInfo(n.word);
    const isUnique = UNIQUE_NOUNS.includes(baseNoun);

    const gNom = isUnique ? 'def' : GROUPS[(batchIdx * 3 + idx) % GROUPS.length];
    const gAkk = isUnique ? 'def' : GROUPS[(batchIdx * 3 + idx + 2) % GROUPS.length];
    const gDat = isUnique ? 'def' : GROUPS[(batchIdx * 3 + idx + 4) % GROUPS.length];

    const cases = [
      { c: 'nominativ', g: gNom },
      { c: 'akkusativ', g: gAkk },
      { c: 'dativ', g: gDat }
    ];

    cases.forEach(({ c, g }) => {
      const detInfo = DETERMINERS[g];
      const art = detInfo.decl[gender]?.[c] || 'der';
      // Required base target answer
      const reqTarget = `${art} ${baseNoun}`;
      requests.push({
        wordId: n.id,
        originalWord: n.word,
        baseNoun,
        gender,
        case: c,
        determinerGroup: g,
        determinerHint: detInfo.hint,
        requiredTarget: reqTarget
      });
    });
  });

  const prompt = `
Du bist ein erfahrener deutscher Sprachlehrer und Linguist.
Erstelle für jede der folgenden Aufgaben einen perfekten, natürlichen Alltags-Übungssatz zur Satzvervollständigung.

WICHTIGSTE FORMALE REGELN:
1. Die Lücke ("targetAnswer") MUSS das geforderte Begleitwort PLUS das Nomen enthalten (z. B. "ein solches Bett", "dem Theater", "einen anderen Garten", "meinem Freund", "keine Zeit").
2. "sentenceStart" ist alles VOR der Lücke. Wenn die Lücke am Satzanfang steht, ist "sentenceStart" leer ("").
   - "sentenceStart" darf NIEMALS mit einem Artikel (der/die/das/ein/eine) enden!
   - "sentenceStart" darf NIEMALS mit einer verschmolzenen Präposition (im, am, zum, vom, beim, ins, ans) enden! Benutze stattdessen offene Präpositionen wie "In ", "Vor ", "An ", "Zu ", "Bei ".
   - "sentenceStart" MUSS mit einem Leerzeichen enden, wenn es nicht leer ist!
3. "sentenceEnd" ist alles NACH der Lücke.
4. "fullSentence" MUSS EXAKT GLEICH "sentenceStart" + "targetAnswer" + "sentenceEnd" sein!
5. Groß-/Kleinschreibung:
   - Beginnt der Satz mit der Lücke ("sentenceStart": ""), muss "targetAnswer" GROSS beginnen (z. B. "Ein solches Bett", "Der Raum").
   - Steht die Lücke im Satz, ist das Begleitwort klein ("ein solches Bett", "dem Theater").
6. Grammatische Natürlichkeit:
   - Dativ muss einen klaren Dativ-Auslöser haben (Dativ-Verb wie "helfen", "gefallen", "danken", ODER Dativ-Präposition wie "in ", "vor ", "mit ", "zu "). Niemals "gehen dem Theater" ohne Präposition!
   - Akkusativ muss transitives Verb oder Akkusativ-Präposition ("für ", "durch ") haben.

Aufgaben:
${requests.map((r, i) => `${i + 1}. Nomen: ${r.baseNoun} (${r.gender}), Fall: ${r.case}, Vorgeschlagenes Ziel: "${r.requiredTarget}"`).join('\n')}

Gib ausschließlich ein JSON-Array zurück:
[
  {
    "baseNoun": "...",
    "gender": "...",
    "case": "...",
    "sentenceStart": "...",
    "targetAnswer": "...",
    "sentenceEnd": "...",
    "fullSentence": "...",
    "translation": "..."
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
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter HTTP ${response.status}: ${err}`);
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
    const detGroup = req.determinerGroup || 'def';
    const detHint = req.determinerHint || '(der, die, das)';

    let sentenceStart = item.sentenceStart !== undefined ? item.sentenceStart : '';
    let targetAnswer = item.targetAnswer ? item.targetAnswer.trim() : '';
    let sentenceEnd = item.sentenceEnd !== undefined ? item.sentenceEnd : '';

    // Safety checks on spacing
    if (sentenceStart.length > 0 && !sentenceStart.endsWith(' ')) {
      sentenceStart += ' ';
    }

    const fullSentence = `${sentenceStart}${targetAnswer}${sentenceEnd}`;

    // Accepted answers
    const accepted = new Set();
    accepted.add(targetAnswer.toLowerCase());
    accepted.add(noun.toLowerCase());

    // If 'ein solcher' / 'ein anderer', also accept inverted or short forms
    if (detGroup === 'solch') {
      const withoutEin = targetAnswer.replace(/^(ein|eine|einen|einem|einer|eines)\s+/i, '');
      accepted.add(withoutEin.toLowerCase());
      accepted.add(`solch ein ${noun}`.toLowerCase());
      accepted.add(`solch eine ${noun}`.toLowerCase());
    } else if (detGroup === 'ander') {
      const withoutEin = targetAnswer.replace(/^(ein|eine|einen|einem|einer|eines)\s+/i, '');
      accepted.add(withoutEin.toLowerCase());
    }

    return {
      id: `ex_${req.wordId || i}_${c}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      wordId: req.wordId,
      baseNoun: noun,
      originalWord: req.originalWord,
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
      ruleExplanation: `${c.charAt(0).toUpperCase() + c.slice(1)} von '${noun}'.`,
      category: 'top1000'
    };
  });
}

async function main() {
  console.log('Starte saubere Neugenerierung von Grund auf mit Gemini 2.5...');
  const nouns = getNounsFromSqlite();
  console.log(`Gefundene Top-1000 Nomen: ${nouns.length}`);

  const BATCH_SIZE = 12; // ~36 sentences per batch
  const allGenerated = [];

  for (let i = 0; i < nouns.length; i += BATCH_SIZE) {
    const batch = nouns.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(nouns.length / BATCH_SIZE);

    console.log(`Generiere sauberen Batch ${batchNum}/${totalBatches} (${batch.length} Nomen)...`);

    let success = false;
    let retries = 0;

    while (!success && retries < 3) {
      try {
        const results = await generateBatch(batch, batchNum);
        allGenerated.push(...results);
        console.log(`  ✓ Batch ${batchNum} erfolgreich (${results.length} Sätze). Gesamt: ${allGenerated.length}`);
        success = true;
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allGenerated, null, 2), 'utf8');
      } catch (err) {
        retries++;
        console.error(`  ✗ Fehler in Batch ${batchNum} (Versuch ${retries}):`, err.message);
        await new Promise(res => setTimeout(res, 2000 * retries));
      }
    }

    await new Promise(res => setTimeout(res, 700));
  }

  console.log(`\n🎉 Vollständig neu generiert: ${allGenerated.length} Sätze.`);
  console.log(`Gespeichert in: ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error('Fataler Fehler:', err);
  process.exit(1);
});
