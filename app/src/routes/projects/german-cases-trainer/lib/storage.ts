import type { FSRSCard, UserStats } from './types';

const STORAGE_PREFIX = 'river_german_cases_';
const STORAGE_CARDS = `${STORAGE_PREFIX}cards_v1`;
const STORAGE_STATS = `${STORAGE_PREFIX}stats_v1`;

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function loadUserStats(): UserStats {
  const defaultStats: UserStats = {
    todayCompleted: 0,
    todayWordIds: [],
    todaySentencesCompleted: 0,
    todaySentenceIds: [],
    dailyGoal: 25,
    streakDays: 1,
    lastActiveDate: getTodayDateString(),
    totalMastered: 0,
    totalReviews: 0,
    correctAnswersCount: 0,
    skipPeopleAndProfessions: false,
    inputMode: 'buttons'
  };

  if (typeof localStorage === 'undefined') return defaultStats;

  try {
    const raw = localStorage.getItem(STORAGE_STATS);
    if (!raw) return defaultStats;

    const parsed: UserStats = JSON.parse(raw);
    const today = getTodayDateString();

    if (!Array.isArray(parsed.todayWordIds)) {
      parsed.todayWordIds = [];
    }
    if (!Array.isArray(parsed.todaySentenceIds)) {
      parsed.todaySentenceIds = [];
    }
    if (typeof parsed.todaySentencesCompleted !== 'number') {
      parsed.todaySentencesCompleted = parsed.todaySentenceIds.length;
    }
    if (typeof parsed.skipPeopleAndProfessions !== 'boolean') {
      parsed.skipPeopleAndProfessions = false;
    }
    if (parsed.inputMode !== 'buttons' && parsed.inputMode !== 'typing') {
      parsed.inputMode = 'buttons';
    }

    // Reset today's count if new day
    checkAndResetDailyProgress(parsed);

    return parsed;
  } catch (err) {
    console.warn('Fehler beim Laden der Benutzerstatistik:', err);
    return defaultStats;
  }
}

export function checkAndResetDailyProgress(stats: UserStats): { stats: UserStats; didReset: boolean } {
  const today = getTodayDateString();
  if (!stats.lastActiveDate || stats.lastActiveDate !== today) {
    const lastParts = (stats.lastActiveDate || today).split('-').map(Number);
    const todayParts = today.split('-').map(Number);
    const lastDate = new Date(lastParts[0], lastParts[1] - 1, lastParts[2]);
    const todayDate = new Date(todayParts[0], todayParts[1] - 1, todayParts[2]);
    const diffDays = Math.round((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Consecutive day! Maintain streak
      stats.streakDays = (stats.streakDays || 1) + 1;
    } else if (diffDays > 1) {
      // Streak broken
      stats.streakDays = 1;
    }

    stats.todayCompleted = 0;
    stats.todayWordIds = [];
    stats.todaySentencesCompleted = 0;
    stats.todaySentenceIds = [];
    stats.lastActiveDate = today;
    saveUserStats(stats);
    return { stats, didReset: true };
  }
  return { stats, didReset: false };
}

export function saveUserStats(stats: UserStats): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_STATS, JSON.stringify(stats));
  } catch (e) {
    console.warn('Fehler beim Speichern der Benutzerstatistik:', e);
  }
}

export function loadCardsMap(): Record<string, FSRSCard> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_CARDS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn('Fehler beim Laden der Karten:', e);
    return {};
  }
}

export function saveCardsMap(cards: Record<string, FSRSCard>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_CARDS, JSON.stringify(cards));
  } catch (e) {
    console.warn('Fehler beim Speichern der Karten:', e);
  }
}

export function clearAllProgress(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_CARDS);
    localStorage.removeItem(STORAGE_STATS);
  } catch (e) {
    console.warn('Fehler beim Löschen des Fortschritts:', e);
  }
}
