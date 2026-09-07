import type { FSRSCard } from './types';

/**
 * Lightweight, robust FSRS-inspired spaced repetition scheduler.
 * Predicts memory stability and calculates optimal review intervals.
 */

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const INITIAL_STABILITY = 1.0;  // 1 day
const INITIAL_DIFFICULTY = 5.0; // Medium (1 - 10 scale)

export function createNewCard(exerciseId: string): FSRSCard {
  return {
    exerciseId,
    state: 'new',
    due: Date.now(),
    stability: INITIAL_STABILITY,
    difficulty: INITIAL_DIFFICULTY,
    reps: 0,
    lapses: 0
  };
}

export type ReviewRating = 'again' | 'good' | 'mastered';

export function scheduleCard(card: FSRSCard, rating: ReviewRating): FSRSCard {
  const now = Date.now();
  const updated = { ...card, lastReview: now };

  if (rating === 'mastered') {
    updated.state = 'mastered';
    updated.stability = Infinity;
    updated.due = Infinity; // Permanently mastered: never scheduled for revision again
    return updated;
  }

  if (rating === 'again') {
    // Forgotten or "Ich weiß das nicht"
    updated.state = 'learning';
    updated.lapses += 1;
    updated.reps = 0;
    // Harder difficulty, minimum stability
    updated.difficulty = Math.min(10, updated.difficulty + 1.2);
    updated.stability = Math.max(0.2, updated.stability * 0.4);
    // Due soon (re-test within current session in 5 minutes)
    updated.due = now + 5 * 60 * 1000;
    return updated;
  }

  // rating === 'good' (Correctly typed!)
  if (updated.state === 'new') {
    updated.state = 'review';
    updated.reps = 1;
    updated.stability = 1.2;
    updated.due = now + Math.round(updated.stability * ONE_DAY_MS);
  } else {
    updated.state = 'review';
    updated.reps += 1;
    // Calculate new stability using decay factor
    const factor = Math.max(1.3, 2.5 - (updated.difficulty - 5) * 0.15);
    updated.stability = Math.min(365, updated.stability * factor);
    // Decrease difficulty slightly on consecutive successes
    updated.difficulty = Math.max(1, updated.difficulty - 0.2);
    updated.due = now + Math.round(updated.stability * ONE_DAY_MS);
  }

  return updated;
}

/**
 * Categorizes cards into:
 * 1. Due Reviews (ready for practice right now)
 * 2. New Cards (haven't been studied yet)
 * 3. Mastered Cards (fully known)
 */
export function partitionQueue(
  cards: Record<string, FSRSCard>,
  exerciseIds: string[],
  dailyLimit = 25,
  todayCompleted = 0
): {
  dueQueue: string[];
  newQueue: string[];
  masteredCount: number;
} {
  const now = Date.now();
  const dueQueue: string[] = [];
  const newQueue: string[] = [];
  let masteredCount = 0;

  for (const id of exerciseIds) {
    const card = cards[id];
    if (!card || card.state === 'new') {
      newQueue.push(id);
    } else if (card.state === 'mastered') {
      masteredCount++;
    } else if (card.due <= now) {
      dueQueue.push(id);
    }
  }

  return { dueQueue, newQueue, masteredCount };
}
