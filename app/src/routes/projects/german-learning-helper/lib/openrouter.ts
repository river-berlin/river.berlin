import type { 
  EvaluationResult, 
  ContinuationEvaluation, 
  StoryChapter, 
  Question,
  OpenRouterConfig 
} from './types';

export const DEFAULT_MODEL = 'google/gemini-3.7-flash';
export const TTS_MODEL = 'google/gemini-3.1-flash-tts-preview';

export const DEFAULT_TTS_VOICE = 'Kore';

/**
 * Wraps raw 16-bit mono PCM audio in a standard RIFF/WAV header
 */
function pcmToWavBlob(pcmData: Uint8Array, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Blob {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmData.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // ChunkSize
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);          // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);           // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true);  // SampleRate
  view.setUint32(28, byteRate, true);    // ByteRate
  view.setUint16(32, blockAlign, true);  // BlockAlign
  view.setUint16(34, bitsPerSample, true);// BitsPerSample

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);    // Subchunk2Size

  // Copy PCM audio payload
  const pcmBytes = new Uint8Array(buffer, 44);
  pcmBytes.set(pcmData);

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Generates audio speech using google/gemini-3.1-flash-tts-preview via OpenRouter /api/v1/audio/speech
 */
export async function generateSpeech(config: OpenRouterConfig, text: string, voice = DEFAULT_TTS_VOICE): Promise<Blob> {
  if (!config.apiKey || !config.apiKey.trim()) {
    throw new Error('API-Schlüssel erforderlich für Gemini TTS.');
  }

  const response = await fetch('https://openrouter.ai/api/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey.trim()}`,
      'HTTP-Referer': config.siteUrl || 'https://river.berlin',
      'X-Title': config.siteName || 'river.berlin German Learning Helper',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: TTS_MODEL,
      input: text,
      voice: voice || DEFAULT_TTS_VOICE,
      response_format: 'pcm'
    })
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || JSON.stringify(errJson);
    } catch {
      errorDetail = await response.text();
    }
    throw new Error(`TTS Fehler (${response.status}): ${errorDetail}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return pcmToWavBlob(new Uint8Array(arrayBuffer), 24000, 1, 16);
}

/**
 * Translates a selected German word or phrase in the context of the story using Gemini 3.7 Flash
 */
export async function translateSelection(
  config: OpenRouterConfig,
  selectedText: string,
  contextSentence?: string
): Promise<{ translation: string; explanation?: string }> {
  const systemPrompt = `Du bist ein präziser Deutsch-Englisch-Übersetzer und Vokabel-Assistent.
Deine Aufgabe: Übersetze das ausgewählte deutsche Wort oder die Phrase präzise und kontextbezogen ins Englische.
Falls es sich um ein trennbares Verb, eine Redewendung oder eine besondere grammatische Form handelt, füge eine kurze deutsche Anmerkung hinzu (z.B. "Trennbares Verb: aufstehen", "Dativ Plural von...").

Antworte strikt im gültigen JSON-Format:
{
  "translation": "String (präzise englische Übersetzung)",
  "explanation": "String (kurze sprachliche Anmerkung auf Deutsch oder leerer String)"
}`;

  const userPrompt = `Kontext: "${contextSentence || ''}"\nAusgewählter deutscher Text: "${selectedText}"\nGib nur das JSON zurück.`;

  const rawJson = await callOpenRouter(config, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], 0.2);

  const parsed = parseJsonFromLlmResponse<{ translation: string; explanation?: string }>(rawJson);
  return {
    translation: parsed.translation || '',
    explanation: parsed.explanation || ''
  };
}

/**
 * Validates the OpenRouter API key against the auth/key endpoint
 */
export async function verifyApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  if (!apiKey || !apiKey.trim()) {
    return { valid: false, error: 'Bitte gib einen API-Schlüssel ein.' };
  }
  try {
    const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`
      }
    });
    if (res.ok) {
      return { valid: true };
    }
    let msg = 'Der API-Schlüssel ist ungültig oder abgelaufen.';
    try {
      const j = await res.json();
      if (j.error?.message) msg = j.error.message;
    } catch {}
    return { valid: false, error: msg };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Verbindungsfehler zu OpenRouter.' };
  }
}

/**
 * Strips markdown json code blocks and parses JSON safely
 */
function parseJsonFromLlmResponse<T>(content: string): T {
  let cleaned = content.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const sub = cleaned.substring(firstBrace, lastBrace + 1);
      return JSON.parse(sub) as T;
    }
    throw new Error(`Fehler beim Verarbeiten der Antwort von OpenRouter: ${(err as Error).message}\nInhalt:\n${content.slice(0, 300)}...`);
  }
}

async function callOpenRouter(config: OpenRouterConfig, messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, temperature = 0.6): Promise<string> {
  if (!config.apiKey || !config.apiKey.trim()) {
    throw new Error('OpenRouter API-Schlüssel fehlt. Bitte trage deinen Schlüssel ein.');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey.trim()}`,
      'HTTP-Referer': config.siteUrl || 'https://river.berlin',
      'X-Title': config.siteName || 'river.berlin German Learning Helper',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.model || DEFAULT_MODEL,
      messages,
      temperature,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || JSON.stringify(errJson);
    } catch {
      errorDetail = await response.text();
    }
    throw new Error(`OpenRouter API Fehler (${response.status}): ${errorDetail}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  if (!choice || !choice.message || !choice.message.content) {
    throw new Error('Leere Antwort von OpenRouter erhalten.');
  }

  return choice.message.content;
}

/**
 * Generates a new C1/C2 advanced German short story with 3 comprehension questions (all in German).
 */
export async function generateNewStory(config: OpenRouterConfig): Promise<StoryChapter> {
  const systemPrompt = `Du bist ein renommierter deutschsprachiger Schriftsteller und Dozent für Deutsch als Fremdsprache (C1/C2).
Deine Aufgabe ist es, eine anspruchsvolle, faszinierende Kurzgeschichte auf gehobenem C1/C2-Niveau in fehlerfreiem, ausdrucksstarkem Deutsch zu verfassen.

Wähle ein intellektuell anregendes Thema (z.B. historische Spurensuche, philosophische Dilemmata, psychologische Geheimnisse oder Berliner Stadtkultur).

Kriterien:
- Niveau: C1/C2 (anspruchsvoller Satzbau, eleganter Stil, differenzierter Wortschatz, Konjunktiv, Nuancen).
- Länge: 220 - 350 Wörter in 3 gut strukturierten Absätzen.
- 4-6 anspruchsvolle Vokabeln/Wendungen mit deutscher Erklärung.
- Genau 3 tiefgründige Verständnisfragen auf Deutsch zum Text.
- KEINE englischen Übersetzungen oder englischen Erklärungen verwenden – alles ausschließlich auf Deutsch!

Antworte strikt im gültigen JSON-Format gemäß diesem Schema:
{
  "titleGerman": "String (Titel der Geschichte ohne 'Kapitel'-Präfix)",
  "storyGerman": "String (Der vollständige Text auf Deutsch, Absätze durch doppelte Zeilenumbrüche getrennt)",
  "vocabulary": [
    {
      "german": "String (z.B. 'das Palimpsest, -e')",
      "definitionGerman": "String (prägnante deutsche Bedeutungserklärung)",
      "partOfSpeech": "String",
      "exampleSentence": "String (Beispielsatz)"
    }
  ],
  "questions": [
    {
      "questionGerman": "String (Verständnisfrage 1 auf Deutsch)",
      "targetConcept": "String (z.B. 'Textverständnis & Kausalität')"
    },
    {
      "questionGerman": "String (Verständnisfrage 2 auf Deutsch)",
      "targetConcept": "String"
    },
    {
      "questionGerman": "String (Verständnisfrage 3 auf Deutsch)",
      "targetConcept": "String"
    }
  ]
}`;

  const userPrompt = `Verfasse eine neue anspruchsvolle deutsche Geschichte auf C1/C2 Niveau mit 3 Fragen. Antworte nur mit JSON.`;

  const rawJson = await callOpenRouter(config, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]);

  const parsed = parseJsonFromLlmResponse<{
    titleGerman: string;
    storyGerman: string;
    vocabulary: Array<{ german: string; definitionGerman: string; partOfSpeech?: string; exampleSentence?: string }>;
    questions: Array<{ questionGerman: string; targetConcept?: string }>;
  }>(rawJson);

  return {
    id: `chapter-${Date.now()}`,
    chapterNumber: 1,
    titleGerman: parsed.titleGerman || 'Die Geschichte',
    storyGerman: parsed.storyGerman,
    cefrLevel: 'C1',
    genre: 'Literarisch & Philosophie',
    vocabulary: parsed.vocabulary || [],
    questions: (parsed.questions || []).map((q, idx) => ({
      id: `q-${Date.now()}-${idx + 1}`,
      questionGerman: q.questionGerman,
      targetConcept: q.targetConcept,
      userDraftAnswer: '',
      lastEvaluation: null
    }))
  };
}

/**
 * Evaluates a user's answer to a comprehension question purely in German.
 */
export async function evaluateQuestionAnswer(
  config: OpenRouterConfig,
  storyContext: string,
  question: Question,
  userAnswer: string
): Promise<EvaluationResult> {
  const systemPrompt = `Du bist ein erfahrener Deutschlehrer für Fortgeschrittene (C1/C2).
Bewerte die Antwort eines Lernenden auf eine Verständnisfrage.

Textkontext:
"""
${storyContext}
"""

Gestellte Frage:
"${question.questionGerman}"

Antwort des Lernenden:
"""
${userAnswer}
"""

WICHTIGE PÄDAGOGISCHE REGELN:
1. Alles ausschließlich auf Deutsch verfassen (kein Englisch).
2. Akzeptiere Standard-Transliterationen (ae für ä, oe für ö, ue für ü, ss für ß) als vollkommen korrekt.
3. Gib dem Lernenden NIEMALS die perfekte fertige Lösung vor. Verwende die sokratische Methode mit Denkanstößen, grammatischen Prinzipien und konkreten Hinweisen, damit der Lernende die Antwort selbstständig korrigieren und erneut einreichen kann.
4. Markiere fehlerhafte Textstellen für die farbige Unterstreichung:
   - "spelling": Rechtschreibfehler, Groß-/Kleinschreibung von Substantiven.
   - "grammar": Kasusfehler, Deklination, Konjugation, Konjunktiv.
   - "word_choice": Stil, falsche Wortwahl, unpassendes Register.
   - "word_order": Wortstellung (Verbzweitstellung im Hauptsatz, Verbletztstellung im Nebensatz).
   - "content_logic": Inhaltliche Unstimmigkeit bezüglich des Textes.

5. Lobe ausdrücklich gelungene Aspekte.

Antworte strikt im gültigen JSON-Format:
{
  "overallVerdict": "excellent" | "good" | "partially_correct" | "needs_revision",
  "verdictLabel": "String (z.B. 'Ausgezeichnet!', 'Guter Ansatz!', 'Fast perfekt!', 'Noch überarbeiten')",
  "germanProficiencyComment": "String (1-2 Sätze auf Deutsch zur sprachlichen Qualität)",
  "comprehensionComment": "String (Wurde die Frage inhaltlich bezüglich des Textes richtig erfasst?)",
  "praise": "String (Was ist sprachlich oder inhaltlich besonders gut gelungen)",
  "socraticGuidance": "String (Sokratischer Denkanstoß/Tipp zur eigenständigen Verbesserung)",
  "annotations": [
    {
      "originalText": "Exakter Textausschnitt aus der Antwort des Lernenden",
      "type": "spelling" | "grammar" | "word_choice" | "word_order" | "content_logic",
      "hint": "Kurzer sokratischer Tipp auf Deutsch",
      "explanation": "Kurze sprachliche Erklärung der Regel"
    }
  ]
}`;

  const userPrompt = `Bewerte die Antwort auf Deutsch. Antworte nur mit JSON.`;

  const rawJson = await callOpenRouter(config, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]);

  const parsed = parseJsonFromLlmResponse<EvaluationResult>(rawJson);

  return {
    overallVerdict: parsed.overallVerdict || 'good',
    verdictLabel: parsed.verdictLabel || 'Rückmeldung erhalten',
    germanProficiencyComment: parsed.germanProficiencyComment || '',
    comprehensionComment: parsed.comprehensionComment || '',
    praise: parsed.praise || 'Gute Arbeit beim Formulieren auf Deutsch!',
    socraticGuidance: parsed.socraticGuidance || 'Lies deinen Satz noch einmal durch und achte auf die Wortstellung.',
    annotations: parsed.annotations || [],
    userAnswerAtEvaluation: userAnswer,
    evaluatedAt: Date.now()
  };
}

/**
 * Evaluates the user's continuation of the story.
 */
export async function evaluateContinuation(
  config: OpenRouterConfig,
  fullStoryContext: string,
  userContinuation: string
): Promise<ContinuationEvaluation> {
  const systemPrompt = `Du bist ein Literaturdozent und Mentor für kreatives Schreiben auf Deutsch (C1/C2).
Bewerte die Fortsetzung einer Geschichte durch einen Lernenden.

Bisherige Handlung:
"""
${fullStoryContext}
"""

Fortsetzung des Lernenden:
"""
${userContinuation}
"""

Regeln:
1. Alles ausschließlich auf Deutsch (kein Englisch).
2. Akzeptiere ae, oe, ue, ss als gültig.
3. Gib sokratische Denkanstöße zur sprachlichen Verfeinerung und logischen Handlungsführung, ohne den Text vorzuschreiben.

Antworte strikt im gültigen JSON-Format:
{
  "overallVerdict": "excellent" | "good" | "needs_revision",
  "verdictLabel": "String (z.B. 'Spannende Fortsetzung!', 'Guter Entwurf', 'Noch überarbeiten')",
  "grammarFeedback": "String (Rückmeldung zu Sprache und Stil)",
  "logicFeedback": "String (Rückmeldung zum Handlungsfluss)",
  "praise": "String (Gelungene kreative und sprachliche Aspekte)",
  "socraticGuidance": "String (Sokratischer Tipp zum Weiterschreiben)",
  "annotations": [
    {
      "originalText": "Exakter Textausschnitt",
      "type": "spelling" | "grammar" | "word_choice" | "word_order" | "content_logic",
      "hint": "Hinweis auf Deutsch",
      "explanation": "Erklärung auf Deutsch"
    }
  ]
}`;

  const userPrompt = `Bewerte die Fortsetzung auf Deutsch. Antworte nur mit JSON.`;

  const rawJson = await callOpenRouter(config, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]);

  const parsed = parseJsonFromLlmResponse<ContinuationEvaluation>(rawJson);

  return {
    overallVerdict: parsed.overallVerdict || 'good',
    verdictLabel: parsed.verdictLabel || 'Fortsetzung geprüft',
    grammarFeedback: parsed.grammarFeedback || '',
    logicFeedback: parsed.logicFeedback || '',
    praise: parsed.praise || 'Tolle Fortsetzung der Geschichte!',
    socraticGuidance: parsed.socraticGuidance || 'Achte auf den Erzählfluss.',
    annotations: parsed.annotations || [],
    userContinuationAtEvaluation: userContinuation,
    evaluatedAt: Date.now()
  };
}

/**
 * Generates the NEXT chapter based on the story history and user's continuation (all in German).
 */
export async function continueStoryWithAI(
  config: OpenRouterConfig,
  storyHistoryText: string,
  userContinuation: string,
  nextChapterNum: number
): Promise<StoryChapter> {
  const systemPrompt = `Du bist ein deutschsprachiger Autor und führst eine literarische Geschichte auf C1/C2-Niveau fort.

Bisheriger Kontext:
"""
${storyHistoryText}
"""

Fortsetzung des Lernenden:
"""
${userContinuation}
"""

Aufgabe:
1. Knüpfe an den Beitrag des Lernenden an und schreibe den nächsten Abschnitt auf Deutsch (200 - 320 Wörter in 2-3 Absätzen).
2. Füge 4-6 Vokabeln mit deutscher Begriffserklärung hinzu.
3. Formuliere 3 neue Verständnisfragen auf Deutsch.
4. Verwende KEIN Englisch.

Antworte strikt im gültigen JSON-Format:
{
  "titleGerman": "String (Titel ohne 'Kapitel')",
  "storyGerman": "String (Neuer Abschnitt auf Deutsch)",
  "vocabulary": [
    {
      "german": "String",
      "definitionGerman": "String",
      "partOfSpeech": "String",
      "exampleSentence": "String"
    }
  ],
  "questions": [
    {
      "questionGerman": "String",
      "targetConcept": "String"
    },
    {
      "questionGerman": "String",
      "targetConcept": "String"
    },
    {
      "questionGerman": "String",
      "targetConcept": "String"
    }
  ]
}`;

  const userPrompt = `Führe die Geschichte auf Deutsch fort. Antworte nur mit JSON.`;

  const rawJson = await callOpenRouter(config, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]);

  const parsed = parseJsonFromLlmResponse<{
    titleGerman: string;
    storyGerman: string;
    vocabulary: Array<{ german: string; definitionGerman: string; partOfSpeech?: string; exampleSentence?: string }>;
    questions: Array<{ questionGerman: string; targetConcept?: string }>;
  }>(rawJson);

  return {
    id: `chapter-${Date.now()}`,
    chapterNumber: nextChapterNum,
    titleGerman: parsed.titleGerman || 'Fortsetzung',
    storyGerman: parsed.storyGerman,
    cefrLevel: 'C1',
    genre: 'Literarisch & Philosophie',
    vocabulary: parsed.vocabulary || [],
    questions: (parsed.questions || []).map((q, idx) => ({
      id: `q-${Date.now()}-${idx + 1}`,
      questionGerman: q.questionGerman,
      targetConcept: q.targetConcept,
      userDraftAnswer: '',
      lastEvaluation: null
    }))
  };
}
