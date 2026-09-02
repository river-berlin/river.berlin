import type { 
  EvaluationResult, 
  ContinuationEvaluation, 
  StoryChapter, 
  Question,
  VocabularyItem,
  DifficultyLevel,
  OpenRouterConfig 
} from './types';

export const DEFAULT_MODEL = 'google/gemini-3.8-flash';
export const TRANSLATION_MODEL = 'openai/gpt-oss-120b:nitro';
export const TTS_MODEL = 'google/gemini-3.1-flash-tts-preview';
export const DEFAULT_TTS_VOICE = 'Kore';

const STORY_THEMES = [
  'Eine unerwartete Entdeckung bei der Restaurierung eines alten Gemäldes in einer Werkstatt in Dresden',
  'Ein spätnächtliches Gespräch zwischen zwei Fremden im Speisewagen des Nachtzugs von Berlin nach Zürich',
  'Ein geheimnisvoller Brief im Nachlass eines Hamburger Hafenmeisters aus dem frühen 20. Jahrhundert',
  'Eine wissenschaftliche Kontroverse an einem Meeresforschungsinstitut an der Ostsee',
  'Ein sonderbarer Stammgast in einem traditionellen Wiener Kaffeehaus, der niemals eine Zeitung liest',
  'Ein architektonisches Experiment im Bauhaus-Stil in Dessau und die Suche nach den verschollenen Plänen',
  'Eine Jazz-Sängerin im Berlin der Goldenen Zwanziger auf der Suche nach einem gestohlenen Liedtext',
  'Ein unerklärliches Phänomen in einer abgelegenen Wetterstation in den Schweizer Alpen',
  'Ein Missverständnis auf dem sonntäglichen Flohmarkt am Mauerpark mit weitreichenden Folgen',
  'Eine Spurensuche in den unterirdischen Gewölben und Kasematten der Festung Königstein',
  'Ein Koch in einem traditionsreichen Gasthaus im Schwarzwald, der ein uraltes Familienrezept entschlüsselt',
  'Eine Philosophin und ein Softwareentwickler debattieren in München über das Wesen künstlicher Intelligenz',
  'Eine Botanikerin entdeckt im Botanischen Garten Leipzig eine Pflanze mit verblüffenden Eigenschaften',
  'Ein Uhrmacher im Glashütter Erzgebirge repariert eine Taschenuhr, die eine geheime Inschrift verbirgt',
  'Ein Zufallsfund in der Österreichischen Nationalbibliothek in Wien, der ein historisches Rätsel löst',
  'Eine nächtliche Begegnung im Skulpturenpark am Starnberger See und ein unerwartetes Geständnis',
  'Ein junger Buchdrucker in Frankfurt am Main, der auf einer uralten Gutenberg-Presse eine verborgene Botschaft druckt',
  'Ein Bootsbauer am Bodensee, der ein altes Mahagoniboot mit mysteriöser Herkunft restauriert'
];

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
 * Fast streaming translation of selected German text.
 * Outputs plain text "[Translation] | [Grammar/Rektion Note]" directly without thinking or JSON overhead,
 * so the very first token emitted is the English translation.
 */
export async function translateSelectionStream(
  config: OpenRouterConfig,
  selectedText: string,
  contextSentence: string,
  onChunk: (partial: { translation: string; explanation: string }) => void,
  signal?: AbortSignal
): Promise<{ translation: string; explanation: string }> {
  const systemPrompt = `You are a lightning-fast German-to-English translator and vocabulary assistant.
Translate the selected German word or short phrase directly into English in the context of the sentence.
Do NOT output markdown, intro words, or quotes. Output ONLY plain text in this exact format:
[English translation] | [Short German grammar note or Rektion if relevant (e.g. "auf + Akk.", "trennbares Verb")]

Example 1:
to depend on | auf + Akk.

Example 2:
security deposit | feminin, -en

Example 3:
to be available | Nomen-Verb-Verbindung`;

  const userPrompt = `Context: "${contextSentence || ''}"\nSelected German text: "${selectedText}"\nOutput translation:`;

  let accumulated = '';
  await streamOpenRouter(
    config,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    (chunk) => {
      accumulated = chunk;
      const parts = accumulated.split('|');
      const trans = parts[0].trim().replace(/^["']|["']$/g, '');
      const expl = parts.length > 1 ? parts.slice(1).join('|').trim().replace(/^["']|["']$/g, '') : '';
      onChunk({ translation: trans, explanation: expl });
    },
    0.1,
    signal
  );

  const parts = accumulated.split('|');
  const finalTrans = parts[0].trim().replace(/^["']|["']$/g, '');
  const finalExpl = parts.length > 1 ? parts.slice(1).join('|').trim().replace(/^["']|["']$/g, '') : '';

  return {
    translation: finalTrans || selectedText,
    explanation: finalExpl
  };
}

/**
 * Backwards-compatible translateSelection wrapper
 */
export async function translateSelection(
  config: OpenRouterConfig,
  selectedText: string,
  contextSentence?: string
): Promise<{ translation: string; explanation?: string }> {
  return translateSelectionStream(config, selectedText, contextSentence || '', () => {});
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

/**
 * Executes a streaming chat completion request to OpenRouter SSE with AbortSignal support
 */
export async function streamOpenRouter(
  config: OpenRouterConfig,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  onChunk: (accumulatedText: string) => void,
  temperature = 0.7,
  signal?: AbortSignal
): Promise<string> {
  if (!config.apiKey || !config.apiKey.trim()) {
    throw new Error('OpenRouter API-Schlüssel fehlt. Bitte trage deinen Schlüssel ein.');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal,
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
      stream: true,
      ...(config.model?.includes('gpt-oss-120b') ? { provider: { order: ['Cerebras', 'Groq'] } } : {})
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

  if (!response.body) {
    throw new Error('Keine Streaming-Verbindung möglich.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let fullText = '';
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) {
        break;
      }
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.replace(/^data:\s*/, '');
        if (dataStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(dataStr);
          const token = parsed.choices?.[0]?.delta?.content || '';
          if (token) {
            fullText += token;
            onChunk(fullText);
          }
        } catch {
          // partial json chunk, skip
        }
      }
    }
  } catch (err: any) {
    if (err.name === 'AbortError' || signal?.aborted) {
      return fullText;
    }
    throw err;
  }

  return fullText;
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
 * Parses markdown stream into structured feedback sections:
 * 1. Feedback / Analysis
 * 2. Better Reformulation
 * 3. Sample / Model Answer
 */
export function parseEvaluationSections(rawText: string): {
  feedback: string;
  betterReformulation: string;
  sampleAnswer: string;
} {
  let feedback = '';
  let betterReformulation = '';
  let sampleAnswer = '';

  const sampleAnswerRegex = /###\s*(?:💡\s*)?(?:Musterantwort|Musterlösung|Ideale\s+Antwort)[\s:]*/i;
  const reformulationRegex = /###\s*(?:✨\s*)?(?:Bessere\s+Formulierung|Verbesserte\s+Formulierung|Stilistischer\s+Vorschlag|Stilistisch\s+verbesserte\s+Fortsetzung)[\s:]*/i;

  const sampleParts = rawText.split(sampleAnswerRegex);
  if (sampleParts.length > 1) {
    sampleAnswer = sampleParts[1].trim();
  }

  const beforeSample = sampleParts[0];
  const refParts = beforeSample.split(reformulationRegex);
  if (refParts.length > 1) {
    feedback = refParts[0].replace(/^###\s*(?:📝\s*)?(?:Rückmeldung\s*&\s*Korrektur|Rückmeldung|Korrektur|Analyse)[\s:]*/i, '').trim();
    betterReformulation = refParts[1].trim();
  } else {
    feedback = beforeSample.replace(/^###\s*(?:📝\s*)?(?:Rückmeldung\s*&\s*Korrektur|Rückmeldung|Korrektur|Analyse)[\s:]*/i, '').trim();
  }

  return { feedback, betterReformulation, sampleAnswer };
}

/**
 * Parses streamed markdown story text into structured StoryChapter data
 */
export function parseStoryStream(rawText: string, chapterNumber = 1, cefrLevel: DifficultyLevel = 'C1'): StoryChapter {
  let titleGerman = 'Neue Geschichte';
  let storyGerman = '';
  const vocabulary: VocabularyItem[] = [];
  const questions: Question[] = [];

  const questionsMarker = /###\s*(?:❓\s*)?(?:Fragen\s+zur\s+Geschichte|Fragen|Verständnisfragen)[\s:]*/i;
  const vocabMarker = /###\s*(?:📚\s*)?(?:Wortschatz|Vokabeln|Schlüsselvokabular)[\s:]*/i;

  let storyAndVocabPart = rawText;
  let questionsPart = '';

  const qMatch = rawText.split(questionsMarker);
  if (qMatch.length > 1) {
    storyAndVocabPart = qMatch[0];
    questionsPart = qMatch[1];
  }

  let storyPart = storyAndVocabPart;
  let vocabPart = '';

  const vMatch = storyAndVocabPart.split(vocabMarker);
  if (vMatch.length > 1) {
    storyPart = vMatch[0];
    vocabPart = vMatch[1];
  }

  // Parse Title and Story Text
  const trimmedStory = storyPart.trim();
  const titleMatch = trimmedStory.match(/^#\s+(.+)$/m) || trimmedStory.match(/^\*\*(.+?)\*\*/);
  if (titleMatch) {
    titleGerman = titleMatch[1].replace(/^Kapitel\s*\d*[:\-.]?\s*/i, '').trim();
    storyGerman = trimmedStory.replace(/^#\s+.+$/m, '').trim();
  } else {
    const lines = trimmedStory.split('\n').filter(l => l.trim().length > 0);
    if (lines.length > 0 && lines[0].length < 80 && !lines[0].endsWith('.')) {
      titleGerman = lines[0].replace(/^#+\s*/, '').trim();
      storyGerman = lines.slice(1).join('\n\n').trim();
    } else {
      storyGerman = trimmedStory;
    }
  }

  // Parse Vocabulary items
  if (vocabPart) {
    const vocabLines = vocabPart.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('*') || /^\d+\./.test(l.trim()));
    for (const vLine of vocabLines) {
      const line = vLine.replace(/^[-*•]\s*|\d+\.\s*/, '').trim();
      if (!line) continue;
      
      const boldMatch = line.match(/\*\*(.+?)\*\*\s*(?:\((.+?)\))?[:—–-]?\s*(.+)/);
      if (boldMatch) {
        const word = boldMatch[1].trim();
        const pos = boldMatch[2]?.trim() || '';
        let rest = boldMatch[3]?.trim() || '';
        
        let example = '';
        const exMatch = rest.match(/[»"'](.+?)[«"']/);
        if (exMatch) {
          example = exMatch[1].trim();
          rest = rest.replace(/[»"'].+?[«"']/, '').replace(/Beispielsatz[:\s]*/i, '').trim();
        }
        
        vocabulary.push({
          german: word,
          partOfSpeech: pos,
          definitionGerman: rest.replace(/^[—–: -]+/, '').trim(),
          exampleSentence: example
        });
      } else {
        vocabulary.push({
          german: line,
          definitionGerman: ''
        });
      }
    }
  }

  // Parse Questions
  if (questionsPart) {
    const questionLines = questionsPart.split('\n').filter(l => /^\d+\.|\?|^-/.test(l.trim()));
    for (let i = 0; i < questionLines.length; i++) {
      const qText = questionLines[i].replace(/^\d+[\.\)]\s*|^[-*•]\s*/, '').trim();
      if (qText && qText.length > 4) {
        questions.push({
          id: `q-${Date.now()}-${questions.length + 1}`,
          questionGerman: qText,
          userDraftAnswer: '',
          lastEvaluation: null
        });
      }
    }
  }

  return {
    id: `chapter-${Date.now()}`,
    chapterNumber,
    titleGerman: titleGerman || 'Die Geschichte',
    storyGerman: storyGerman || rawText,
    cefrLevel,
    genre: 'Zeitgenössisch & Alltagskultur',
    vocabulary: vocabulary.length > 0 ? vocabulary : [
      { german: 'das Wort', definitionGerman: 'Ein neuer Begriff aus der Geschichte' }
    ],
    questions: questions.length > 0 ? questions : [
      { id: `q-${Date.now()}-1`, questionGerman: 'Worin besteht der Hauptgedanke dieses Textes?', userDraftAnswer: '', lastEvaluation: null },
      { id: `q-${Date.now()}-2`, questionGerman: 'Welche Details oder Motive fallen besonders auf?', userDraftAnswer: '', lastEvaluation: null },
      { id: `q-${Date.now()}-3`, questionGerman: 'Wie bewertest du das Verhalten oder die Situation der handelnden Personen?', userDraftAnswer: '', lastEvaluation: null }
    ]
  };
}

/**
 * Streams the generation of a new German short story with vocabulary and comprehension questions in real time.
 */
export async function generateNewStoryStream(
  config: OpenRouterConfig,
  cefrLevel: DifficultyLevel = 'C1',
  onChunk: (accumulatedText: string) => void,
  signal?: AbortSignal
): Promise<StoryChapter> {
  const levelDescriptions: Record<DifficultyLevel, string> = {
    A2: 'Niveau A2 (Gemeinsamer Europäischer Referenzrahmen / Goethe-Standard: elementare Grammatik, klare Hauptsätze, Alltagsvokabular, ca. 130-180 Wörter)',
    B1: 'Niveau B1 (Goethe/Telc B1 Standard: selbstständige Sprachverwendung, gängige Nebensätze mit weil/dass/obwohl/wenn, Perfekt & Präteritum, flüssige Alltagssprache, ca. 160-220 Wörter)',
    B2: 'Niveau B2 (Goethe/Telc B2 Standard: abwechslungsreicher Wortschatz, feste Nomen-Verb-Verbindungen, Passiv, Konjunktiv II, moderne journalistische Alltagssprache, ca. 190-250 Wörter)',
    C1: 'Niveau C1 (Goethe-Zertifikat C1 / Telc C1 Hochschule Standard: modernes, authentisches und flüssiges Deutsch, wie in Qualitätsmedien (DIE ZEIT, Spiegel). Präziser und reichhaltiger Wortschatz, elegante Konnektoren (infolgedessen, wenngleich, demnach). WICHTIG: Vermeide künstlich überladene 19.-Jahrhundert-Schachtelsätze oder antiquierte Poesie; der Text soll natürlich, lesbar und zeitgemäß sein! ca. 220-290 Wörter)',
    C2: 'Niveau C2 (Exzellentes muttersprachliches Niveau: idiomatische Nuancen, stilistische Eleganz, lebendige und treffsichere Formulierungen, ca. 250-330 Wörter)'
  };

  const currentLevelDesc = levelDescriptions[cefrLevel] || levelDescriptions['C1'];

  // Select a dynamic random theme and seed to prevent repetition
  const randomTheme = STORY_THEMES[Math.floor(Math.random() * STORY_THEMES.length)];
  const randomSeed = Math.floor(Math.random() * 1000000);

  const systemPrompt = `Du bist ein erfahrener Deutschdozent und Autor für zeitgenössische DaF-Texte (Deutsch als Fremdsprache).
Deine Aufgabe ist es, eine neue, packende Kurzgeschichte auf dem offiziellen GER/CEFR-Sprachniveau **${cefrLevel}** zu verfassen.

Niveau-Kalibrierung (GER / Goethe-Zertifikat):
${currentLevelDesc}

WICHTIGE STIL-RICHTLINIEN:
- Schreibe in lebendigem, modernem Gegenwartsdeutsch (keine verstaubte oder übertrieben altmodische Literatursprache).
- Halte die Sätze rhythmisch, klar und lesefreundlich.
- Schreibe alles ausschließlich auf Deutsch (kein Englisch).

STRUKTUR (GENAU so formatieren):

# [Titel der Geschichte]

[Absatz 1 der Geschichte auf Deutsch]

[Absatz 2 der Geschichte auf Deutsch]

[Absatz 3 der Geschichte auf Deutsch]

### 📚 Wortschatz
- **das Wort / die Phrase** (Wortart): Prägnante Bedeutungserklärung auf Deutsch. »Beispielsatz im Kontext«
- **das nächste Wort** (Wortart): Erklärung auf Deutsch. »Beispielsatz«
(4-6 Vokabeln, die exakt zu Niveau ${cefrLevel} passen)

### ❓ Fragen zur Geschichte
1. Erste verständliche Frage auf Deutsch zum Inhalt?
2. Zweite verständliche Frage auf Deutsch zum Inhalt?
3. Dritte verständliche Frage auf Deutsch zum Inhalt?`;

  const userPrompt = `Verfasse eine authentische, spannende Geschichte auf Niveau ${cefrLevel}.
Thema / Leitmotiv: "${randomTheme}" (Zufallscode: #${randomSeed}).
Achte auf ein natürliches, dem Niveau ${cefrLevel} entsprechendes Deutsch ohne künstliche Überkomplexität.`;

  const fullStreamText = await streamOpenRouter(
    config,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    onChunk,
    0.8,
    signal
  );

  return parseStoryStream(fullStreamText, 1, cefrLevel);
}

/**
 * Streams the NEXT chapter based on the story history and user's continuation.
 */
export async function continueStoryWithAIStream(
  config: OpenRouterConfig,
  storyHistoryText: string,
  userContinuation: string,
  nextChapterNum: number,
  cefrLevel: DifficultyLevel = 'C1',
  onChunk: (accumulatedText: string) => void,
  signal?: AbortSignal
): Promise<StoryChapter> {
  const systemPrompt = `Du bist ein zeitgenössischer deutschsprachiger Autor und führst eine Geschichte auf GER-Sprachniveau **${cefrLevel}** (Goethe/Telc Standard) fort.

Bisheriger Kontext:
"""
${storyHistoryText}
"""

Fortsetzung des Lernenden:
"""
${userContinuation}
"""

Aufgabe:
1. Knüpfe an den Beitrag des Lernenden an und schreibe den nächsten Abschnitt in lebendigem, modernem Deutsch auf Niveau ${cefrLevel} (ca. 180-260 Wörter in 2-3 Absätzen).
2. Vermeide künstliche Schachtelsätze oder antiquierte Wörter.
3. Füge 4-6 Vokabeln mit deutscher Begriffserklärung hinzu.
4. Formuliere 3 verständliche Verständnisfragen auf Deutsch.
5. Verwende KEIN Englisch.

Strukturiere deinen Text GENAU in diese drei Abschnitte:

# [Titel des neuen Kapitels]

[Absatz 1 der Fortsetzung auf Deutsch]

[Absatz 2 der Fortsetzung auf Deutsch]

### 📚 Wortschatz
- **das Wort** (Wortart): Erklärung auf Deutsch. »Beispielsatz«
(4-6 Vokabeln)

### ❓ Fragen zur Geschichte
1. Erste Frage auf Deutsch?
2. Zweite Frage auf Deutsch?
3. Dritte Frage auf Deutsch?`;

  const userPrompt = `Führe die Geschichte auf Deutsch (Niveau ${cefrLevel}) fort.`;

  const fullStreamText = await streamOpenRouter(
    config,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    onChunk,
    0.75,
    signal
  );

  return parseStoryStream(fullStreamText, nextChapterNum, cefrLevel);
}

/**
 * Streams real-time evaluation of a user's answer to a comprehension question.
 * Corrects all grammar and suggests how a traditional native German speaker would respond.
 */
export async function evaluateQuestionAnswerStream(
  config: OpenRouterConfig,
  storyContext: string,
  question: Question,
  userAnswer: string,
  cefrLevel: DifficultyLevel = 'C1',
  onChunk: (accumulatedText: string) => void,
  signal?: AbortSignal
): Promise<EvaluationResult> {
  const systemPrompt = `Du bist ein erfahrener deutscher Muttersprachler und Sprachexperte.
Bewerte die Antwort eines Lernenden auf eine inhaltliche Verständnisfrage.

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

DEINE AUFGABEN & REGELN:
1. Verwende ausschließlich Deutsch (kein Englisch).
2. Akzeptiere Transliterationen (ae, oe, ue, ss) als gültig.
3. KORRIGIERE ALLE GRAMMATIKFEHLER: Korrigiere ausnahmslos alle grammatikalischen, orthografischen und syntaktischen Fehler gründlich, präzise und konstruktiv (insbesondere Kasus, Rektion, Verbstellung im Haupt- und Nebensatz, Konjugation, Adjektivendungen und Wortwahl).
4. TRADITIONELLES DEUTSCH: Schlage Antworten und Formulierungen so vor, wie ein traditioneller, gebildeter und stilsicherer deutscher Muttersprachler in natürlichem, idiomatischem Deutsch antworten würde.
5. Strukturiere deine Antwort GENAU in die folgenden drei Abschnitte:

### 📝 Rückmeldung & Korrektur
- Gib eine kurze Rückmeldung, ob die Frage inhaltlich richtig beantwortet wurde.
- Erkläre alle grammatikalischen und sprachlichen Fehler verständlich, detailliert und präzise.

### ✨ Bessere Formulierung
Formuliere die Antwort so um, wie ein traditioneller deutscher Muttersprachler den Gedanken klar, elegant, idiomatisch und grammatikalisch vollkommen fehlerfrei ausdrücken würde.

### 💡 Musterantwort
Formuliere eine vollständige, ideale Beispiellösung auf Deutsch, wie sie ein traditioneller deutscher Sprecher formulieren würde.`;

  const userPrompt = `Bewerte die Antwort des Lernenden auf Deutsch. Korrigiere alle Grammatikfehler und zeige, wie ein traditioneller deutscher Sprecher antworten würde.`;

  const fullStreamText = await streamOpenRouter(
    config,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    onChunk,
    0.4,
    signal
  );

  const sections = parseEvaluationSections(fullStreamText);

  return {
    feedbackText: sections.feedback || fullStreamText,
    betterReformulation: sections.betterReformulation || '',
    sampleAnswer: sections.sampleAnswer || '',
    userAnswerAtEvaluation: userAnswer,
    evaluatedAt: Date.now(),
    rawStream: fullStreamText
  };
}

/**
 * Streams real-time evaluation of a user's story continuation.
 * Corrects all grammar and suggests how a traditional native German speaker would respond.
 */
export async function evaluateContinuationStream(
  config: OpenRouterConfig,
  fullStoryContext: string,
  userContinuation: string,
  cefrLevel: DifficultyLevel = 'C1',
  onChunk: (accumulatedText: string) => void,
  signal?: AbortSignal
): Promise<ContinuationEvaluation> {
  const systemPrompt = `Du bist ein erfahrener deutscher Muttersprachler und Redakteur.
Bewerte den Text oder die Fortsetzung eines Lernenden.

Bisheriger Kontext:
"""
${fullStoryContext}
"""

Text des Lernenden:
"""
${userContinuation}
"""

DEINE AUFGABEN & REGELN:
1. Alles ausschließlich auf Deutsch (kein Englisch).
2. Akzeptiere ae, oe, ue, ss als gültig.
3. KORRIGIERE ALLE GRAMMATIKFEHLER: Korrigiere gründlich alle grammatischen, lexikalischen und syntaktischen Fehler.
4. TRADITIONELLES DEUTSCH: Schlage vor, wie ein traditioneller, stilsicherer deutscher Muttersprachler den Text stilistisch elegant, treffsicher und idiomatisch fortführen würde.
5. Strukturiere deine Antwort GENAU in die folgenden zwei Abschnitte:

### 📝 Rückmeldung & Korrektur
- Korrigiere alle Grammatik-, Satzbau- und Wortwahlfehler im Detail.
- Gehe kurz auf Inhalt und Gedankenführung ein.

### ✨ Stilistisch verbesserte Fortsetzung
Formuliere den Text so um, wie ein traditioneller deutscher Muttersprachler ihn in gepflegtem, natürlichem Deutsch formulieren würde, wobei die ursprüngliche Kernaussage erhalten bleibt.`;

  const userPrompt = `Bewerte den Text auf Deutsch. Korrigiere alle Grammatikfehler und zeige, wie ein traditioneller deutscher Sprecher den Text formulieren würde.`;

  const fullStreamText = await streamOpenRouter(
    config,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    onChunk,
    0.4,
    signal
  );

  const sections = parseEvaluationSections(fullStreamText);

  return {
    feedbackText: sections.feedback || fullStreamText,
    betterReformulation: sections.betterReformulation || '',
    userContinuationAtEvaluation: userContinuation,
    evaluatedAt: Date.now(),
    rawStream: fullStreamText
  };
}
