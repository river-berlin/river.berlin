export type DifficultyLevel = 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface Flashcard {
  id: string;
  face1: string;              // German word/cue with category prefix, e.g. "(Rektion) warten ___"
  details: string;            // Grammar rules, case, preposition, small print, e.g. "auf + Akk. | to wait for"
  face2: string;              // English translation or target answer, e.g. "to wait (for)"
  sentence1: string;          // Primary German example sentence
  sentence1_detail: string;   // English translation of sentence 1
  sentence2?: string;         // Secondary German example sentence
  sentence2_detail?: string;  // English translation of sentence 2
  sentence3?: string;         // Third German example sentence
  sentence3_detail?: string;  // English translation of sentence 3
  tag?: string;               // e.g. "Rektion", "Vocab", "Fehler"
  createdAt: number;
}

export type GenerationMode = 'word_list' | 'grammar_topic' | 'mistake_correction' | 'free_prompt';

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  siteUrl?: string;
  siteName?: string;
}
