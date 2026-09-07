import fs from 'fs';
import path from 'path';

const DATA_PATH = '/Users/river/Fun/river.berlin/app/src/routes/projects/german-cases-trainer/data/top1000_cases.json';
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';
const MODEL = 'google/gemini-2.5-flash';

const BAD_TRAILING = new Set([
  'der', 'die', 'das', 'den', 'dem', 'des',
  'ein', 'eine', 'einen', 'einem', 'einer', 'eines',
  'mein', 'meine', 'meinen', 'meinem', 'meiner', 'meines',
  'dein', 'deine', 'deinen', 'deinem', 'deiner', 'deines',
  'sein', 'seine', 'seinen', 'seinem', 'seiner', 'seines',
  'ihr', 'ihre', 'ihren', 'ihrem', 'ihrer', 'ihres',
  'unser', 'unsere', 'unseren', 'unserem', 'unserer', 'unseres',
  'euer', 'eure', 'euren', 'eurem', 'eurer', 'eures',
  'dieser', 'diese', 'dieses', 'diesen', 'diesem', 'dieses',
  'bester', 'große', 'großer', 'großes', 'neue', 'neuer', 'neues', 'alte', 'alter', 'altes'
]);

async function main() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  console.log(`Geladene Übungen: ${data.length}`);

  const cleanList = [];
  const needsFixList = [];

  for (const ex of data) {
    const full = (ex.fullSentence || '').trim();
    const target = (ex.targetAnswer || '').trim();

    // Check if target is inside fullSentence (case-insensitive)
    const regex = new RegExp('\\b' + target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    const match = full.match(regex);

    if (match) {
      const idx = match.index;
      const start = full.slice(0, idx);
      const matchedTarget = match[0];
      const end = full.slice(idx + matchedTarget.length);

      const trailingWord = start.trim().split(/\s+/).pop().toLowerCase();
      if (BAD_TRAILING.has(trailingWord)) {
        needsFixList.push(ex);
      } else {
        // Clean item! Set exact start, target, end
        ex.sentenceStart = start;
        ex.sentenceEnd = end;
        cleanList.push(ex);
      }
    } else {
      needsFixList.push(ex);
    }
  }

  console.log(`Bereits sauber: ${cleanList.length}`);
  console.log(`Muss repariert werden: ${needsFixList.length}`);

  if (needsFixList.length === 0) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(cleanList, null, 2), 'utf-8');
    console.log('Alles sauber!');
    return;
  }

  // Batch process the ones that need fixes in chunks of 15
  const BATCH_SIZE = 15;
  const repairedList = [];

  for (let i = 0; i < needsFixList.length; i += BATCH_SIZE) {
    const batch = needsFixList.slice(i, i + BATCH_SIZE);
    console.log(`Repariere Batch ${Math.floor(i / BATCH_SIZE) + 1} / ${Math.ceil(needsFixList.length / BATCH_SIZE)} (${batch.length} Übungen)...`);

    const promptItems = batch.map(ex => ({
      id: ex.id,
      wordId: ex.wordId,
      baseNoun: ex.baseNoun,
      gender: ex.gender,
      case: ex.case,
      originalWord: ex.originalWord
    }));

    const systemPrompt = `Du bist ein deutscher Linguist.
Deine Aufgabe ist es, für folgende Nomen und Kasus PERFEKTE Satzvervollständigungs-Übungen zu erstellen.

WICHTIGE REGELN:
1. Das Ziel ("targetAnswer") ist das Nomen MIT bestimmtem oder unbestimmtem Artikel im geforderten Kasus (z.B. "der Raum", "den Raum", "dem Raum", "des Raumes" oder "der Freund", "einen Freund", "dem Freund").
2. "sentenceStart" ist der Satzteil VOR der Lücke.
3. "sentenceEnd" ist der Satzteil NACH der Lücke (kann leer sein, falls am Satzende).
4. "fullSentence" MUSS EXAKT GLEICH "sentenceStart" + "targetAnswer" + "sentenceEnd" sein!
5. "sentenceStart" DARF NIEMALS mit einem Artikel ("der", "die", "das", "ein", ...), Possessivpronomen ("mein", "dein", "unser", ...) oder Adjektiv ("bester", "neue", ...) enden!
   FALSCH: "Mein bester " + "der Freund" (unmögliches Deutsch!)
   RICHTIG: "Heute besucht mich " + "der Freund" + " aus Berlin."
   RICHTIG: "" + "Der Freund" + " kommt heute Abend zu Besuch."
6. "acceptedAnswers" enthält 2-3 kleingeschriebene Varianten (z.B. ["der freund", "ein freund"]).
7. "ruleExplanation": Kurze, klare Grammatik-Erklärung (z.B. "Subjekt im Nominativ (maskulin: der Freund).").
8. "translation": Englische Übersetzung des ganzen Satzes.

Antworte STRIKT als valides JSON:
{
  "results": [
    {
      "id": "ex_...",
      "wordId": 123,
      "baseNoun": "Freund",
      "gender": "m",
      "case": "nominativ",
      "sentenceStart": "",
      "targetAnswer": "Der Freund",
      "sentenceEnd": " kommt heute Abend zu Besuch.",
      "acceptedAnswers": ["der freund", "ein freund"],
      "fullSentence": "Der Freund kommt heute Abend zu Besuch.",
      "ruleExplanation": "Subjekt des Satzes steht im Nominativ (maskulin: der Freund).",
      "translation": "The friend is coming to visit tonight."
    }
  ]
}`;

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://river.berlin',
        'X-Title': 'German Cases Repair'
      },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(promptItems, null, 2) }
        ],
        temperature: 0.2
      })
    });

    if (!res.ok) {
      console.error(`Fehler bei Batch: ${await res.text()}`);
      continue;
    }

    const dataRes = await res.json();
    const content = dataRes.choices?.[0]?.message?.content;
    try {
      const parsed = JSON.parse(content);
      const items = parsed.results || [];
      for (const item of items) {
        const orig = batch.find(b => b.id === item.id || (b.baseNoun === item.baseNoun && b.case === item.case));
        if (orig) {
          repairedList.push({
            ...orig,
            sentenceStart: item.sentenceStart || '',
            sentenceEnd: item.sentenceEnd || '',
            targetAnswer: item.targetAnswer,
            acceptedAnswers: item.acceptedAnswers || [item.targetAnswer.toLowerCase()],
            fullSentence: (item.sentenceStart || '') + item.targetAnswer + (item.sentenceEnd || ''),
            ruleExplanation: item.ruleExplanation || orig.ruleExplanation,
            translation: item.translation || orig.translation
          });
        }
      }
      console.log(`✓ Batch repariert! Bisher repariert: ${repairedList.length}`);
    } catch (err) {
      console.error('JSON Parse Fehler:', err);
    }
  }

  // Combine clean and repaired
  const repairedMap = new Map(repairedList.map(r => [r.id, r]));
  const finalDataset = data.map(orig => {
    if (repairedMap.has(orig.id)) {
      return repairedMap.get(orig.id);
    }
    // Make sure clean item has sentenceEnd
    const full = orig.fullSentence;
    const target = orig.targetAnswer;
    const regex = new RegExp('\\b' + target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    const match = full.match(regex);
    if (match) {
      orig.sentenceStart = full.slice(0, match.index);
      orig.sentenceEnd = full.slice(match.index + match[0].length);
    }
    return orig;
  });

  fs.writeFileSync(DATA_PATH, JSON.stringify(finalDataset, null, 2), 'utf-8');
  console.log(`✓ Fertig repariert! ${finalDataset.length} Übungen in ${DATA_PATH} aktualisiert.`);
}

main().catch(console.error);
