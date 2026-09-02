export type DifficultyLevel = 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface FlashcardItem {
  id: string;
  german: string;
  translation: string;
  explanation?: string;
  contextSentence?: string;
  addedAt: number;
  cefrLevel?: DifficultyLevel;
}

export interface EvaluationResult {
  overallVerdict?: 'excellent' | 'good' | 'partially_correct' | 'needs_revision';
  verdictLabel?: string;
  feedbackText: string;             // Ausführliche Rückmeldung zur Grammatik, Wortwahl und Richtigkeit
  betterReformulation?: string;     // Stilistisch und grammatisch verbesserte Formulierung der Antwort
  sampleAnswer?: string;            // Ausführliche Musterantwort / Ideallösung (standardmäßig verborgen)
  userAnswerAtEvaluation: string;
  evaluatedAt: number;
  rawStream?: string;
}

export interface Question {
  id: string;
  questionGerman: string;
  targetConcept?: string;
  userDraftAnswer: string;
  lastEvaluation?: EvaluationResult | null;
  isEvaluating?: boolean;
  streamingFeedback?: string;       // Enthält den Text während des Live-Streamings
}

export interface VocabularyItem {
  german: string;
  definitionGerman: string;
  partOfSpeech?: string;
  exampleSentence?: string;
}

export interface StoryChapter {
  id: string;
  chapterNumber: number;
  titleGerman: string;
  storyGerman: string;
  cefrLevel: DifficultyLevel;
  genre: string;
  vocabulary: VocabularyItem[];
  questions: Question[];
}

export interface ContinuationEvaluation {
  overallVerdict?: 'excellent' | 'good' | 'needs_revision';
  verdictLabel?: string;
  feedbackText: string;             // Feedback zum Schreibstil, Fluss und Grammatik
  betterReformulation?: string;     // Verbesserte Fassung der Fortsetzung
  userContinuationAtEvaluation: string;
  evaluatedAt: number;
  rawStream?: string;
}

export interface StorySession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  difficulty: DifficultyLevel;
  genre: string;
  customTopic?: string;
  chapters: {
    chapter: StoryChapter;
    userContinuation: string;
    continuationEvaluation?: ContinuationEvaluation | null;
    isEvaluatingContinuation?: boolean;
    streamingContinuationFeedback?: string;
  }[];
  currentChapterIndex: number;
}

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  siteUrl?: string;
  siteName?: string;
  seed?: number;
}
