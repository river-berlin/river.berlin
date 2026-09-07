const key = process.env.OPENROUTER_API_KEY || '';

async function testPipeline() {
  const prompt = `
Du bist ein erfahrener deutscher Sprachlehrer und Linguist.
Deine Aufgabe: Erstelle für jedes der folgenden Nomen einen perfekten, natürlichen deutschen Beispielsatz.

WICHTIGSTE VORGABE:
Die Lücke ("targetAnswer") MUSS das Begleitwort PLUS das Nomen im geforderten Kasus sein!
Beispiele für "targetAnswer":
- "Ein solches Bett" (nicht nur "Bett", sondern "Ein solches Bett"!)
- "dem Theater" (nach Präposition "vor", also sentenceStart: "Vor ")
- "einen anderen Garten" (nicht nur "Garten", sondern "einen anderen Garten"!)
- "meinem Freund" (nicht nur "Freund", sondern "meinem Freund"!)
- "keine Zeit" (nicht nur "Zeit", sondern "keine Zeit"!)

REGELN:
1. "targetAnswer" = Begleitwort + Nomen im Fall.
2. "sentenceStart" darf NIEMALS den Artikel enthalten (also "Vor ", NICHT "Vor dem ").
3. "sentenceStart" + "targetAnswer" + "sentenceEnd" === "fullSentence".
4. Begleitwort bei "solch-": Immer Standardform "ein solcher / eine solche / ein solches".
5. Begleitwort bei "ander-": Immer Standardform "ein anderer / eine andere / ein anderes".

Aufgaben:
1. Nomen: Bett (n), Fall: nominativ, Muster: ein solcher -> Ziel: "Ein solches Bett"
2. Nomen: Theater (n), Fall: dativ, Muster: bestimmt -> Ziel: "dem Theater" (Präposition in sentenceStart, z.B. "In ", "Vor ")
3. Nomen: Garten (m), Fall: akkusativ, Muster: ein anderer -> Ziel: "einen anderen Garten"
4. Nomen: Freund (m), Fall: dativ, Muster: mein- -> Ziel: "meinem Freund"
5. Nomen: Zeit (f), Fall: akkusativ, Muster: kein- -> Ziel: "keine Zeit"

Gib NUR ein JSON-Array zurück:
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

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1
    })
  });

  const data = await res.json();
  const text = data.choices[0].message.content.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
  const items = JSON.parse(text);
  console.log(JSON.stringify(items, null, 2));

  items.forEach(it => {
    const isExact = (it.sentenceStart + it.targetAnswer + it.sentenceEnd) === it.fullSentence;
    console.log(`[${it.baseNoun}] Target: "${it.targetAnswer}" | Exact: ${isExact}`);
  });
}

testPipeline();
