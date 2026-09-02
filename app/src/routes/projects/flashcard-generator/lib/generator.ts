import type { Flashcard, DifficultyLevel, OpenRouterConfig, GenerationMode } from './types';

export const DEFAULT_MODEL = 'google/gemini-3.8-flash';

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
 * Executes a streaming chat completion request to OpenRouter SSE with AbortSignal
 */
export async function streamOpenRouter(
  config: OpenRouterConfig,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: any }>,
  onChunk: (accumulatedText: string) => void,
  temperature = 0.6,
  signal?: AbortSignal
): Promise<string> {
  if (!config.apiKey || !config.apiKey.trim()) {
    throw new Error('OpenRouter API-Schlüssel fehlt.');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      'Authorization': `Bearer ${config.apiKey.trim()}`,
      'HTTP-Referer': config.siteUrl || 'https://river.berlin',
      'X-Title': config.siteName || 'river.berlin Flashcard Generator',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.model || DEFAULT_MODEL,
      messages,
      temperature,
      stream: true
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
      if (signal?.aborted) break;
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
          // skip partial JSON
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

/**
 * Parses raw CSV lines or JSON output from LLM stream into Flashcard objects
 */
export function parseCardsFromText(rawText: string): Flashcard[] {
  const cards: Flashcard[] = [];
  const lines = rawText.split('\n');

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line || line.startsWith('```') || line.startsWith('#') || line.startsWith('//')) {
      continue;
    }

    // Try parsing semicolon-delimited CSV with quotes
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      const char = line[charIdx];
      const nextChar = line[charIdx + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          charIdx++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ';' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());

    if (fields.length >= 4) {
      const face1 = fields[0] || '';
      const details = fields[1] || '';
      const face2 = fields[2] || '';
      const s1 = fields[3] || '';
      const s1d = fields[4] || '';
      const s2 = fields[5] || '';
      const s2d = fields[6] || '';
      const s3 = fields[7] || '';
      const s3d = fields[8] || '';

      if (face1 && face2) {
        // Extract tag from face1 if available (e.g. "(Rektion) warten")
        const tagMatch = face1.match(/^\((.+?)\)/);
        const tag = tagMatch ? tagMatch[1] : 'Vocab';

        cards.push({
          id: `card-${Date.now()}-${cards.length + 1}`,
          face1,
          details,
          face2,
          sentence1: s1 || 'Beispielsatz auf Deutsch.',
          sentence1_detail: s1d || 'English translation.',
          sentence2: s2 || undefined,
          sentence2_detail: s2d || undefined,
          sentence3: s3 || undefined,
          sentence3_detail: s3d || undefined,
          tag,
          createdAt: Date.now()
        });
      }
    }
  }

  return cards;
}

const FLASHCARD_SYSTEM_PROMPT = `You are an expert German Language Coach and Flashcard Architect creating high-yield flashcards for the Reword (Android) and Anki apps.
Target German CEFR Level: **C1**.

SCHEMA REQUIREMENTS:
Output strictly semicolon-delimited (;) rows enclosed in double quotes ("...") matching this exact structure:
"face1";"details";"face2";"sentence1";"sentence1_detail";"sentence2";"sentence2_detail";"sentence3";"sentence3_detail"

FIELD DEFINITIONS:
1. face1: The German word (with article & plural) or construction cue with a category tag:
   - Tags: (Rektion), (Adjektivdekl), (Fehler), (Konjunktiv), (Wortstellung), (Nomen-Verb), (Vocab).
2. details: CRITICAL grammar information revealed on the card (preposition + case e.g. "auf + Akk. | Never use 'für'", irregular conjugation, register, separable verb notes, mnemonics). NEVER leave blank if grammar applies!
3. face2: Accurate English translation / correct target structure.
4. sentence1: Natural, authentic, contemporary German example sentence (modern Berlin/workplace/daily life context).
5. sentence1_detail: Accurate English translation of sentence 1.
6. sentence2 & sentence2_detail: Second natural German example sentence + its English translation.
7. sentence3 & sentence3_detail: (Optional) Third illustrative example sentence + translation.

RULES:
- Produce 4 to 8 high-quality flashcards based on the user's input/recording.
- Output ONLY the raw semicolon-delimited CSV rows (no markdown tables, no preamble, no explanations).
- Make sure every field is enclosed in double quotes ("..."), and internal quotes are escaped as "".`;

/**
 * Generates Reword flashcards from text input via Gemini 3.7 Flash
 */
export async function generateFlashcardsStream(
  config: OpenRouterConfig,
  inputPrompt: string,
  mode: GenerationMode = 'free_prompt',
  level: DifficultyLevel = 'C1',
  count = 6,
  onChunk: (accumulatedText: string) => void,
  signal?: AbortSignal
): Promise<Flashcard[]> {
  const rawStream = await streamOpenRouter(
    config,
    [
      { role: 'system', content: FLASHCARD_SYSTEM_PROMPT },
      { role: 'user', content: inputPrompt }
    ],
    onChunk,
    0.6,
    signal
  );

  return parseCardsFromText(rawStream);
}

/**
 * Generates Reword flashcards DIRECTLY from a recorded voice audio clip via Gemini 3.7 Flash
 */
export async function generateFlashcardsFromAudioStream(
  config: OpenRouterConfig,
  audioBase64: string,
  audioMimeType: string = 'audio/webm',
  onChunk: (accumulatedText: string) => void,
  signal?: AbortSignal
): Promise<Flashcard[]> {
  // Extract pure base64 data and clean format name
  const cleanBase64 = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
  let audioFormat = 'wav';
  if (audioMimeType.includes('webm')) audioFormat = 'webm';
  else if (audioMimeType.includes('mp4') || audioMimeType.includes('m4a')) audioFormat = 'mp4';
  else if (audioMimeType.includes('mp3') || audioMimeType.includes('mpeg')) audioFormat = 'mp3';
  else if (audioMimeType.includes('ogg')) audioFormat = 'ogg';

  const userContent = [
    {
      type: 'text',
      text: 'Listen directly to this voice recording (German speech, vocabulary, grammar questions, or language notes). Transcribe and extract all relevant German vocabulary, phrases, grammar rules, or mistakes mentioned, and generate complete Reword CSV flashcards.'
    },
    {
      type: 'input_audio',
      input_audio: {
        data: cleanBase64,
        format: audioFormat
      }
    }
  ];

  const rawStream = await streamOpenRouter(
    config,
    [
      { role: 'system', content: FLASHCARD_SYSTEM_PROMPT },
      { role: 'user', content: userContent }
    ],
    onChunk,
    0.6,
    signal
  );

  return parseCardsFromText(rawStream);
}
