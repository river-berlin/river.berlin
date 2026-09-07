const key = process.env.OPENROUTER_API_KEY || '';

async function testPrompt() {
  const prompt = `
You are a German linguist. Create natural, everyday sentences where the EXACT given target phrase fills the blank.

Constraints:
1. 'targetAnswer' MUST be EXACTLY the provided required target phrase (do not reorder, do not change words).
2. 'sentenceStart' is everything before the target. It must NOT end with an article or contracted preposition (never end with im, am, beim, zum, vom, der, die, etc.).
3. 'sentenceEnd' is everything after the target.
4. 'fullSentence' MUST equal 'sentenceStart' + 'targetAnswer' + 'sentenceEnd'.

Items to generate:
1. Noun: Bett (n), Case: nominativ, REQUIRED TARGET: "Ein solches Bett"
2. Noun: Theater (n), Case: dativ, REQUIRED TARGET: "dem Theater"
3. Noun: Garten (m), Case: akkusativ, REQUIRED TARGET: "einen anderen Garten"
4. Noun: Freund (m), Case: dativ, REQUIRED TARGET: "meinem Freund"
5. Noun: Zeit (f), Case: akkusativ, REQUIRED TARGET: "keine Zeit"

Return ONLY a JSON array:
[
  {
    "targetAnswer": "...",
    "sentenceStart": "...",
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
  console.log(JSON.stringify(JSON.parse(text), null, 2));
}
testPrompt();
