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
  // Fallback if no article in front (e.g. "GmbH", "Eltern")
  const words = clean.split(/[\s(]/);
  return { article: '', baseNoun: words[0], gender: 'n' };
}

// 3. Batch generator with OpenRouter
async function generateBatch(nounsBatch, includeGenitiv = false) {
  const systemPrompt = `Du bist ein erfahrener deutscher Linguist und Didaktiker.
Deine Aufgabe ist es, für hochfrequente deutsche Nomen Übungssätze zur Satzvervollständigung (Kasus-Training) zu erstellen.

WICHTIGE REGELN:
1. Das Ziel ("targetAnswer") ist das Nomen mit bestimmtem oder unbestimmtem Artikel im geforderten Kasus (z.B. "der Bus", "den Bus", "dem Bus", "des Busses").
2. "sentenceStart" ist der Teil VOR der Lücke.
3. "sentenceEnd" ist der Teil NACH der Lücke (z.B. " zur Haltestelle.").
4. "fullSentence" MUSS EXAKT GLEICH "sentenceStart" + "targetAnswer" + "sentenceEnd" sein!
5. "sentenceStart" DARF NIEMALS mit einem Artikel ("der/die/das/ein/eine"), Possessivpronomen ("mein/dein/unser") oder Adjektiv ("bester/große/neue") enden!
   FALSCH: "Mein bester " + "der Freund" (unmögliches Deutsch!)
   RICHTIG: "" + "Der Freund" + " kommt heute Abend zu Besuch."
   RICHTIG: "Dort an der Haltestelle wartet " + "der Bus" + "."
6. Der HINWEIS ("hint") MUSS UNBEDINGT DAS REINE NOMEN OHNE ARTIKEL SEIN (z.B. "Bus", "Hund", "Haus", "Frau")! KEIN "der/die/das" im Hinweis!
7. Verwende Verben und Präpositionen, die den jeweiligen Kasus ZWEIFELSFREI erzwingen:
   - DATIV: Dativ-Verben (helfen, gehören, danken, folgen, vertrauen, gratulieren) oder Dativ-Präpositionen (aus, bei, mit, nach, von, zu).
   - AKKUSATIV: Transitive Verben (sehen, kaufen, suchen, treffen, finden) oder Akkusativ-Präpositionen (durch, für, gegen, ohne, um).
   - NOMINATIV: Subjekt mit Kopulaverb (sein, werden) oder Prädikat am Satzanfang/Satzende.
   - GENITIV (falls gefordert): Genitiv-Präposition (wegen, trotz, während) oder klares Genitivattribut.
8. Gib zu jeder Übung eine prägnante, motivierende Erklärung ("ruleExplanation"), z.B.: "Präposition 'mit' verlangt immer Dativ (der Bus ➔ dem Bus)".
9. Gib eine englische Übersetzung ("translation") des ganzen Satzes an.

Antworte STRIKT als valides JSON nach folgendem Schema:
{
  "results": [
    {
      "wordId": 123,
      "baseNoun": "Bus",
      "exercises": [
        {
          "case": "nominativ",
          "sentenceStart": "Dort an der Haltestelle kommt ",
          "targetAnswer": "der Bus",
          "sentenceEnd": ".",
          "acceptedAnswers": ["der bus", "ein bus"],
          "fullSentence": "Dort an der Haltestelle kommt der Bus.",
          "hint": "Bus",
          "ruleExplanation": "Subjekt des Satzes steht im Nominativ (maskulin: der Bus).",
          "translation": "There at the stop comes the bus."
        }
      ]
    }
  ]
}`;

  const promptContent = `Erstelle für folgende Nomen Übungssätze (jeweils Nominativ, Akkusativ, Dativ${includeGenitiv ? ' und zusätzlich Genitiv' : ''}):\n` +
    nounsBatch.map(n => `- ID ${n.id}: "${n.word}" (Bedeutung: ${n.meaning})`).join('\n');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://river.berlin',
      'X-Title': 'river.berlin German Cases Generator'
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: promptContent }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  const parsed = JSON.parse(content);
  return parsed.results || [];
}

async function main() {
  console.log('--- Deutsches Kasus-Trainer Datensatz-Generator ---');
  
  // Create output dir if needed
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

  let existingExercises = [];
  if (fs.existsSync(OUTPUT_PATH)) {
    try {
      existingExercises = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
      console.log(`Vorhandene Übungen geladen: ${existingExercises.length}`);
    } catch (e) {
      console.warn('Vorhandene Datei konnte nicht gelesen werden, starte neu.');
    }
  }

  const generatedWordIds = new Set(existingExercises.map(e => e.wordId));
  const rawNouns = getNounsFromSqlite();
  console.log(`Nomen in SQLite (Top 1000): ${rawNouns.length}`);

  const nounsToProcess = rawNouns.filter(n => !generatedWordIds.has(n.id));
  console.log(`Verbleibende Nomen zu generieren: ${nounsToProcess.length}`);

  if (nounsToProcess.length === 0) {
    console.log('Alle Nomen der Top 1000 sind bereits vollständig generiert!');
    return;
  }

  const BATCH_SIZE = 10;
  for (let i = 0; i < nounsToProcess.length; i += BATCH_SIZE) {
    const batch = nounsToProcess.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(nounsToProcess.length / BATCH_SIZE);
    console.log(`\nVerarbeite Batch ${batchNum}/${totalBatches} (${batch.length} Nomen)...`);

    try {
      // 10% of nouns get Genitiv
      const includeGenitiv = (batchNum % 3 === 0);
      const results = await generateBatch(batch, includeGenitiv);

      for (const res of results) {
        const nounInfo = batch.find(b => b.id === res.wordId) || parseNounInfo(res.baseNoun);
        const { baseNoun, gender } = parseNounInfo(nounInfo.word || res.baseNoun);

        for (const ex of (res.exercises || [])) {
          const exerciseItem = {
            id: `ex_${res.wordId}_${ex.case}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            wordId: res.wordId,
            baseNoun: baseNoun || ex.hint || 'Nomen',
            originalWord: nounInfo.word || res.baseNoun,
            gender: gender || 'n',
            case: ex.case,
            sentenceStart: ex.sentenceStart,
            targetAnswer: ex.targetAnswer,
            acceptedAnswers: Array.from(new Set([
              ex.targetAnswer.toLowerCase().trim(),
              ...(ex.acceptedAnswers || []).map(a => a.toLowerCase().trim())
            ])),
            fullSentence: ex.fullSentence,
            translation: ex.translation || '',
            ruleExplanation: ex.ruleExplanation,
            category: 'top1000'
          };
          existingExercises.push(exerciseItem);
        }
      }

      // Save atomically
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(existingExercises, null, 2), 'utf-8');
      console.log(`✓ Batch ${batchNum} gespeichert! Gesamtübungen jetzt: ${existingExercises.length}`);

      // Small delay between batches to respect rate limits
      await new Promise(r => setTimeout(r, 600));
    } catch (err) {
      console.error(`Fehler in Batch ${batchNum}:`, err.message);
      console.log('Warte 5 Sekunden und fahre fort...');
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  console.log(`\nFertig! Insgesamt ${existingExercises.length} Übungen in ${OUTPUT_PATH} gespeichert.`);
}

main().catch(console.error);
