export type DifficultyLevel = 'A2' | 'B1' | 'B2' | 'C1';

export type AnnotationType = 
  | 'spelling'     // Rechtschreibung & Groß-/Kleinschreibung (Red/Coral)
  | 'grammar'      // Grammatik, Fälle, Konjugation, Endungen (Purple/Indigo)
  | 'word_choice'  // Wortwahl, Falsche Freunde, Idiomatik (Amber/Orange)
  | 'word_order'   // Satzbau, Verbposition, Nebensätze (Emerald/Teal)
  | 'content_logic'; // Inhaltliche Logik / Textbezug (Blue/Cyan)

export interface FeedbackAnnotation {
  id?: string;
  originalText: string;
  type: AnnotationType;
  hint: string;          // Sokratischer Hinweis auf Deutsch
  explanation: string;   // Grammatische/stilistische Erklärung auf Deutsch
  startOffset?: number;
  endOffset?: number;
}

export interface EvaluationResult {
  overallVerdict: 'excellent' | 'good' | 'partially_correct' | 'needs_revision';
  verdictLabel: string;
  germanProficiencyComment: string;
  comprehensionComment: string;
  praise: string;
  socraticGuidance: string;
  annotations: FeedbackAnnotation[];
  userAnswerAtEvaluation: string;
  evaluatedAt: number;
}

export interface Question {
  id: string;
  questionGerman: string;
  targetConcept?: string;
  userDraftAnswer: string;
  lastEvaluation?: EvaluationResult | null;
  isEvaluating?: boolean;
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
  overallVerdict: 'excellent' | 'good' | 'needs_revision';
  verdictLabel: string;
  grammarFeedback: string;
  logicFeedback: string;
  praise: string;
  socraticGuidance: string;
  annotations: FeedbackAnnotation[];
  userContinuationAtEvaluation: string;
  evaluatedAt: number;
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
  }[];
  currentChapterIndex: number;
}

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  siteUrl?: string;
  siteName?: string;
}
