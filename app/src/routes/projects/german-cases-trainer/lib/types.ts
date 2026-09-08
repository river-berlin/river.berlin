export type GrammarCase = 'nominativ' | 'akkusativ' | 'dativ' | 'genitiv';
export type NounGender = 'm' | 'f' | 'n' | 'pl';

export interface RawWordEntry {
  id: number;
  word: string;         // e.g. "der Raum (die Räume)"
  meaning: string;      // e.g. "room, space"
  category: string;     // e.g. "top1000"
}

export interface CaseExercise {
  id: string;
  wordId: number;
  baseNoun: string;             // Crucial: purely the noun WITHOUT article, e.g. "Bus", "Katze", "Kind"
  originalWord: string;         // Full dictionary string, e.g. "der Bus (die Busse)"
  gender: NounGender;           // 'm' | 'f' | 'n' | 'pl'
  case: GrammarCase;            // 'nominativ' | 'akkusativ' | 'dativ' | 'genitiv'
  sentenceStart: string;        // Text preceding the gap, e.g. "Ich fahre jeden Morgen mit "
  sentenceEnd?: string;         // Text following the gap, e.g. " zur Arbeit."
  targetAnswer: string;         // Exact target answer to type, e.g. "dem Bus"
  acceptedAnswers: string[];    // Normalized variations, e.g. ["dem bus", "einem bus"]
  fullSentence: string;         // Complete sentence for review
  translation: string;          // English translation
  determinerGroup?: string;     // 'def' | 'indef' | 'poss' | 'dies' | 'solch' | 'ander' | 'kein'
  determinerHint?: string;      // e.g. "(ein, einem, einer, eines)" or "(mein, meiner, meinem, meine)"
  category: string;             // "top1000", etc.
}

export interface FSRSCard {
  exerciseId: string;
  state: 'new' | 'learning' | 'review' | 'mastered';
  due: number;                  // Timestamp in ms when card is due
  stability: number;            // Memory stability (in days)
  difficulty: number;           // 1 to 10 scale
  reps: number;                 // Number of successful reviews
  lapses: number;               // Number of times forgotten
  lastReview?: number;          // Timestamp of last review
}

export interface UserStats {
  todayCompleted: number;       // Number of unique words finished today
  todayWordIds?: number[];      // Word IDs of nouns completed today
  todaySentencesCompleted?: number; // Number of sentences completed today
  todaySentenceIds?: string[];  // Sentence/exercise IDs completed today
  dailyGoal: number;            // Daily goal in words (default: 25 words/day)
  streakDays: number;
  lastActiveDate: string;       // YYYY-MM-DD
  totalMastered: number;
  totalReviews: number;
  correctAnswersCount: number;
  skipPeopleAndProfessions?: boolean; // Option to skip words representing persons/professions
}
