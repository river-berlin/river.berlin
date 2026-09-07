const key = process.env.OPENROUTER_API_KEY || '';

async function testVerifiedGeneration() {
  const prompt = `
Du bist ein deutscher Grammatikexperte und Sprachlehrer.
Erstelle für jedes der folgenden Nomen einen perfekten, natürlichen Übungssatz zur Satzvervollständigung.

WICHTIGE REGELN FÜR KASUS-AUSLÖSER:
- DATIV erfordert entweder ein Dativ-Verb (z. B. helfen, danken, gehören, gefallen, vertrauen) ODER eine Dativ-Präposition (z. B. mit, bei, von, zu, aus, oder Orts-Präposition wie: in, vor, an, auf). Niemals "gehen + Dativ" ohne Präposition!
- AKKUSATIV erfordert ein transitives Verb (z. B. sehen, kaufen, besuchen, suchen, haben, brauchen) oder Akkusativ-Präposition (für, ohne, um, durch).
- NOMINATIV ist das Subjekt des Satzes.

WICHTIGE FORMALE REGELN:
1. "targetAnswer" ist das Nomen zusammen mit seinem Begleitwort im geforderten Kasus.
2. "sentenceStart" + "targetAnswer" + "sentenceEnd" MUSS EXAKT "fullSentence" ergeben.
3. Wortabstände: "sentenceStart" muss mit einem Leerzeichen enden (z. B. "Wir besuchen "), damit kein Wort zusammenklebt!
4. Groß-/Kleinschreibung:
   - Am Satzanfang (sentenceStart = ""): erster Buchstabe GROSS ("Ein solches Bett...", "Dieser Tisch...")
   - Im Satzinneren: Begleitwort klein ("... ein solches Bett ...", "... dem Theater ...")

Zu erstellende Aufgaben:
1. Nomen: Bett (n), Kasus: nominativ, Begleitwort-Muster: ein solcher (-> Ein solches Bett)
2. Nomen: Theater (n), Kasus: dativ, Begleitwort-Muster: bestimmt (-> dem Theater, z. B. mit Präposition "Vor dem Theater..." oder "In dem Theater...")
3. Nomen: Garten (m), Kasus: akkusativ, Begleitwort-Muster: ein anderer (-> einen anderen Garten)
4. Nomen: Freund (m), Kasus: dativ, Begleitwort-Muster: mein- (-> meinem Freund)
5. Nomen: Zeit (f), Kasus: akkusativ, Begleitwort-Muster: kein- (-> keine Zeit)

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

  // Check consistency
  items.forEach(it => {
    const isExact = (it.sentenceStart + it.targetAnswer + it.sentenceEnd) === it.fullSentence;
    console.log(`[${it.baseNoun}] Exact concatenation: ${isExact}`);
  });
}

testVerifiedGeneration();
