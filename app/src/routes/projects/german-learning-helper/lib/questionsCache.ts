import type { Question } from './types';

const STORAGE_KEY_QUESTIONS_CACHE = 'german_helper_questions_cache_v1';
export const MAX_CACHED_ARTICLES = 10;

export interface CachedQuestionsEntry {
  cacheKey: string;
  articleNum: number;
  seed: number;
  model: string;
  questions: Question[];
  timestamp: number;
}

/**
 * Builds a deterministic cache key based on article index, seed, and model
 */
export function buildCacheKey(articleNum: number, seed: number, model: string): string {
  return `${articleNum}_s${seed}_m${model.replace(/\//g, '_')}`;
}

/**
 * Gets cached questions for an article, updating its LRU position
 */
export function getCachedQuestions(
  articleNum: number,
  seed: number,
  model: string
): Question[] | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_QUESTIONS_CACHE);
    if (!raw) return null;
    const entries: CachedQuestionsEntry[] = JSON.parse(raw);
    if (!Array.isArray(entries) || entries.length === 0) return null;

    const key = buildCacheKey(articleNum, seed, model);
    const foundIdx = entries.findIndex((e) => e.cacheKey === key);
    if (foundIdx === -1) return null;

    // Refresh timestamp and move to front (LRU)
    const entry = entries[foundIdx];
    if (!entry.questions || !Array.isArray(entry.questions) || entry.questions.length === 0) {
      return null;
    }
    entry.timestamp = Date.now();
    entries.splice(foundIdx, 1);
    entries.unshift(entry);

    localStorage.setItem(STORAGE_KEY_QUESTIONS_CACHE, JSON.stringify(entries));

    // Return deep cloned questions
    return JSON.parse(JSON.stringify(entry.questions));
  } catch (e) {
    console.warn('Fehler beim Lesen des Fragen-Caches:', e);
    return null;
  }
}

/**
 * Saves questions for an article to the rolling cache (max 10 items)
 */
export function saveCachedQuestions(
  articleNum: number,
  seed: number,
  model: string,
  questions: Question[]
): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (!questions || questions.length === 0) return;

  try {
    const key = buildCacheKey(articleNum, seed, model);
    let entries: CachedQuestionsEntry[] = [];
    const raw = localStorage.getItem(STORAGE_KEY_QUESTIONS_CACHE);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) entries = parsed;
      } catch {}
    }

    // Remove existing entry for the same key
    entries = entries.filter((e) => e.cacheKey !== key);

    // Prepend new entry
    entries.unshift({
      cacheKey: key,
      articleNum,
      seed,
      model,
      questions: JSON.parse(JSON.stringify(questions)),
      timestamp: Date.now()
    });

    // Enforce rolling 10-article limit
    if (entries.length > MAX_CACHED_ARTICLES) {
      entries = entries.slice(0, MAX_CACHED_ARTICLES);
    }

    localStorage.setItem(STORAGE_KEY_QUESTIONS_CACHE, JSON.stringify(entries));
  } catch (e) {
    console.warn('Fehler beim Speichern im Fragen-Cache:', e);
  }
}

/**
 * Returns the current number of cached article questions
 */
export function getCachedEntriesCount(): number {
  if (typeof window === 'undefined' || !window.localStorage) return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_QUESTIONS_CACHE);
    if (!raw) return 0;
    const entries = JSON.parse(raw);
    return Array.isArray(entries) ? entries.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Clears the questions cache
 */
export function clearQuestionsCache(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  localStorage.removeItem(STORAGE_KEY_QUESTIONS_CACHE);
}
