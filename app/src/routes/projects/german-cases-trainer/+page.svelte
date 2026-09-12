<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { CaseExercise, FSRSCard, UserStats, GrammarCase, NounGender } from './lib/types';
  import { createNewCard, scheduleCard, partitionQueue, getCardRepsRemaining, MASTERY_REPS_THRESHOLD } from './lib/fsrs';
  import { loadUserStats, saveUserStats, loadCardsMap, saveCardsMap, clearAllProgress, checkAndResetDailyProgress } from './lib/storage';
  import { getDetailedGrammarExplanation } from './lib/grammarExplanation';
  import { isPersonOrProfession } from './lib/personNouns';
  import { getDeterminerButtonGroups, type DeterminerButtonGroupResult } from './lib/buttonOptions';

  // Settings & modal state
  let showSettingsModal = false;
  let showInfoModal = false;
  let showResetConfirm = false;
  let resetSuccessToast = false;

  // Exercises data
  let allExercises: CaseExercise[] = [];
  let filteredExercises: CaseExercise[] = [];
  let cardsMap: Record<string, FSRSCard> = {};
  let userStats: UserStats = {
    todayCompleted: 0,
    todayWordIds: [],
    todaySentencesCompleted: 0,
    todaySentenceIds: [],
    dailyGoal: 25,
    streakDays: 1,
    lastActiveDate: '',
    totalMastered: 0,
    totalReviews: 0,
    correctAnswersCount: 0,
    skipPeopleAndProfessions: false,
    inputMode: 'buttons'
  };

  // Session & Queue
  let dueQueue: string[] = [];
  let newQueue: string[] = [];
  let sessionQueue: string[] = [];
  let currentExerciseIndex = 0;
  let currentExercise: CaseExercise | null = null;

  // Active interaction state
  let selectedPart1 = '';
  let selectedPart2 = '';
  let buttonWrongPart1 = false;
  let buttonWrongPart2 = false;
  let isCorrect = false;
  let isRevealed = false;
  let showTranslation = false;
  let isAutoAdvancing = false;
  let selectedCaseFilter: GrammarCase | 'all' = 'all';
  let selectedTierFilter: 'all' | 'top1000' | 'top2000' | 'top3000' | 'top4000' = 'all';
  let installPromptEvent: any = null;
  let showInstallButton = false;
  let isStandalone = false;
  let isLoadingData = true;

  // Visual cues
  let showConfettiCelebration = false;
  let activeTab: 'new' | 'review' | 'words' = 'new';
  let isMinimalMode = false;

  // Words directory state
  let nounMeaningsMap: Record<string, string> = {};
  let wordStatusFilter: 'all' | 'remaining' | 'learning' | 'due' | 'mastered' | 'already_known' = 'all';
  let wordsSearchQuery = '';
  let wordTierFilter: 'all' | 'top1000' | 'top2000' | 'top3000' | 'top4000' = 'all';
  let wordGenderFilter: 'all' | 'm' | 'f' | 'n' | 'pl' = 'all';
  let wordSortOrder: 'az' | 'za' | 'reps_desc' | 'reps_asc' | 'tier' = 'az';
  let wordsPage = 1;
  const WORDS_PER_PAGE = 35;
  let expandedWordId: number | null = null;

  $: currentExercise = sessionQueue.length > 0 && sessionQueue[currentExerciseIndex]
    ? allExercises.find(e => e.id === sessionQueue[currentExerciseIndex]) || null
    : null;

  $: buttonGroups = currentExercise ? getDeterminerButtonGroups(currentExercise) : null;

  function getExerciseNoun(exercise: CaseExercise | null): string {
    if (!exercise) return '';
    const parts = exercise.targetAnswer.trim().split(/\s+/);
    const detCount = (exercise.determinerGroup === 'ander' || (exercise.determinerGroup === 'solch' && parts.length > 2)) ? 2 : 1;
    const noun = parts.slice(detCount).join(' ');
    return noun || exercise.baseNoun;
  }

  $: exerciseNoun = getExerciseNoun(currentExercise);

  $: grammarBreakdown = currentExercise ? getDetailedGrammarExplanation(currentExercise) : null;

  $: dailySentencesGoal = Math.max(1, userStats.dailyGoal * (selectedCaseFilter === 'all' ? 3 : 1));
  $: wordsPercent = Math.min(100, Math.round((userStats.todayCompleted / userStats.dailyGoal) * 100));
  $: sentencesPercent = Math.min(100, Math.round(((userStats.todaySentencesCompleted || 0) / dailySentencesGoal) * 100));
  $: progressPercent = wordsPercent;

  $: exerciseById = new Map(allExercises.map(e => [e.id, e]));

  // Reactive queue computations based on filteredExercises and cardsMap
  $: dueExercises = filteredExercises.filter(e => {
    const card = cardsMap[e.id];
    return card && card.state !== 'new' && card.state !== 'mastered' && card.due <= Date.now();
  });
  $: dueQueue = dueExercises.map(e => e.id);
  $: dueWordsCount = (() => {
    const wordIds = new Set<number>();
    for (const e of dueExercises) {
      wordIds.add(e.wordId);
    }
    return wordIds.size;
  })();

  $: newExercises = filteredExercises.filter(e => {
    const card = cardsMap[e.id];
    return !card || card.state === 'new' || card.state === 'learning';
  });
  $: newQueue = newExercises.map(e => e.id);
  $: newWordsCount = (() => {
    const wordIds = new Set<number>();
    for (const e of newExercises) {
      wordIds.add(e.wordId);
    }
    return wordIds.size;
  })();

  // Group allExercises by wordId for the comprehensive "Wörter" tab
  $: uniqueWordsList = (() => {
    if (!allExercises || allExercises.length === 0) return [];
    const map = new Map<number, {
      wordId: number;
      baseNoun: string;
      originalWord: string;
      gender: NounGender;
      category: string;
      exercises: CaseExercise[];
    }>();

    for (const ex of allExercises) {
      let entry = map.get(ex.wordId);
      if (!entry) {
        entry = {
          wordId: ex.wordId,
          baseNoun: ex.baseNoun,
          originalWord: ex.originalWord,
          gender: ex.gender,
          category: ex.category,
          exercises: []
        };
        map.set(ex.wordId, entry);
      }
      entry.exercises.push(ex);
    }

    const now = Date.now();
    return Array.from(map.values()).map(w => {
      let masteredCount = 0;
      let dueCount = 0;
      let learningCount = 0;
      let maxRepsNeeded = 0;
      let totalRepsNeeded = 0;

      const caseBreakdown: Record<string, { repsRemaining: number; isDue: boolean; isMastered: boolean }> = {};

      for (const ex of w.exercises) {
        const card = cardsMap[ex.id];
        const repsRemaining = getCardRepsRemaining(card);
        const isMastered = card ? (card.state === 'mastered' || repsRemaining === 0) : false;
        const isDue = card ? (card.state !== 'new' && !isMastered && card.due <= now) : false;
        const isLearning = card ? (card.state === 'learning' || card.state === 'review') : false;

        if (isMastered) masteredCount++;
        if (isDue) dueCount++;
        if (isLearning) learningCount++;

        maxRepsNeeded = Math.max(maxRepsNeeded, repsRemaining);
        totalRepsNeeded += repsRemaining;

        caseBreakdown[ex.case] = {
          repsRemaining,
          isDue,
          isMastered
        };
      }

      // Auto-heal previously marked cards: if any card for this word was marked 'mastered' or 'isAlreadyKnown',
      // mark all sentences of this word as mastered and known
      let isAlreadyKnown = w.exercises.some(ex => {
        const c = cardsMap[ex.id];
        return c && (c.isAlreadyKnown || c.state === 'mastered');
      });

      if (isAlreadyKnown) {
        masteredCount = w.exercises.length;
        maxRepsNeeded = 0;
        totalRepsNeeded = 0;
        for (const ex of w.exercises) {
          if (!cardsMap[ex.id] || cardsMap[ex.id].state !== 'mastered') {
            const c = cardsMap[ex.id] || createNewCard(ex.id);
            c.state = 'mastered';
            c.stability = Infinity;
            c.due = Infinity;
            c.isAlreadyKnown = true;
            cardsMap[ex.id] = c;
          }
          caseBreakdown[ex.case] = {
            repsRemaining: 0,
            isDue: false,
            isMastered: true
          };
        }
      }

      let status: 'mastered' | 'already_known' | 'due' | 'learning' | 'remaining' = 'remaining';
      if (masteredCount === w.exercises.length && w.exercises.length > 0) {
        status = isAlreadyKnown ? 'already_known' : 'mastered';
      } else if (dueCount > 0) {
        status = 'due';
      } else if (learningCount > 0 || (userStats.todayWordIds && userStats.todayWordIds.includes(w.wordId))) {
        status = 'learning';
      } else {
        status = 'remaining';
      }

      const meaning = nounMeaningsMap[String(w.wordId)] || '';

      return {
        ...w,
        status,
        meaning,
        maxRepsNeeded,
        totalRepsNeeded,
        caseBreakdown
      };
    });
  })();

  $: totalWordsCount = uniqueWordsList.length;
  $: remainingWordsCount = uniqueWordsList.filter(w => w.status === 'remaining').length;
  $: learningWordsCount = uniqueWordsList.filter(w => w.status === 'learning').length;
  $: dueWordsCountInList = uniqueWordsList.filter(w => w.status === 'due').length;
  $: masteredWordsCount = uniqueWordsList.filter(w => w.status === 'mastered').length;
  $: alreadyKnownWordsCount = uniqueWordsList.filter(w => w.status === 'already_known').length;

  $: filteredWordsList = (() => {
    let list = uniqueWordsList;

    if (wordStatusFilter !== 'all') {
      list = list.filter(w => w.status === wordStatusFilter);
    }

    if (wordTierFilter !== 'all') {
      list = list.filter(w => w.category === wordTierFilter);
    }

    if (wordGenderFilter !== 'all') {
      list = list.filter(w => w.gender === wordGenderFilter);
    }

    if (wordsSearchQuery.trim()) {
      const q = wordsSearchQuery.trim().toLowerCase();
      list = list.filter(w => 
        w.baseNoun.toLowerCase().includes(q) ||
        w.originalWord.toLowerCase().includes(q) ||
        w.meaning.toLowerCase().includes(q)
      );
    }

    const tierWeight: Record<string, number> = { top1000: 1, top2000: 2, top3000: 3, top4000: 4 };
    return [...list].sort((a, b) => {
      if (wordSortOrder === 'az') {
        return a.baseNoun.localeCompare(b.baseNoun, 'de');
      } else if (wordSortOrder === 'za') {
        return b.baseNoun.localeCompare(a.baseNoun, 'de');
      } else if (wordSortOrder === 'reps_desc') {
        return b.maxRepsNeeded - a.maxRepsNeeded || a.baseNoun.localeCompare(b.baseNoun, 'de');
      } else if (wordSortOrder === 'reps_asc') {
        return a.maxRepsNeeded - b.maxRepsNeeded || a.baseNoun.localeCompare(b.baseNoun, 'de');
      } else if (wordSortOrder === 'tier') {
        const twA = tierWeight[a.category] || 5;
        const twB = tierWeight[b.category] || 5;
        return twA - twB || a.baseNoun.localeCompare(b.baseNoun, 'de');
      }
      return 0;
    });
  })();

  $: paginatedWordsList = filteredWordsList.slice(0, wordsPage * WORDS_PER_PAGE);
  $: hasMoreWords = paginatedWordsList.length < filteredWordsList.length;

  function practiceSpecificWord(wordId: number) {
    const exercisesForWord = allExercises.filter(e => e.wordId === wordId);
    if (exercisesForWord.length === 0) return;
    
    const caseOrder: Record<string, number> = { nominativ: 1, akkusativ: 2, dativ: 3, genitiv: 4 };
    exercisesForWord.sort((a, b) => (caseOrder[a.case] || 9) - (caseOrder[b.case] || 9));

    sessionQueue = exercisesForWord.map(e => e.id);
    currentExerciseIndex = 0;
    resetCardState();
    activeTab = 'new';
  }

  function toggleWordExpand(wordId: number) {
    expandedWordId = expandedWordId === wordId ? null : wordId;
  }

  function formatGenderPill(g: NounGender): { label: string; style: string } {
    switch (g) {
      case 'm': return { label: 'der (Maskulin)', style: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/50' };
      case 'f': return { label: 'die (Feminin)', style: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/50' };
      case 'n': return { label: 'das (Neutrum)', style: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/50' };
      default: return { label: 'Plural', style: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/50' };
    }
  }

  function getWordStatusBadge(status: 'mastered' | 'already_known' | 'due' | 'learning' | 'remaining'): { label: string; style: string } {
    switch (status) {
      case 'already_known':
        return { label: 'Bereits bekannt 🌟', style: 'bg-teal-50 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border-teal-200/80 dark:border-teal-800/50' };
      case 'mastered':
        return { label: 'Gemeistert ✓', style: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/50' };
      case 'due':
        return { label: 'Fällig zur Wiederholung ⏳', style: 'bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/50' };
      case 'learning':
        return { label: 'Beim Lernen 🔄', style: 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/50' };
      case 'remaining':
      default:
        return { label: 'Noch offen ⚪', style: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/50' };
    }
  }

  function expandContractions(text: string): string {
    return text
      .replace(/\bim\b/gi, 'in dem')
      .replace(/\bam\b/gi, 'an dem')
      .replace(/\bans\b/gi, 'an das')
      .replace(/\bins\b/gi, 'in das')
      .replace(/\bbeim\b/gi, 'bei dem')
      .replace(/\bvom\b/gi, 'von dem')
      .replace(/\bzum\b/gi, 'zu dem')
      .replace(/\bzur\b/gi, 'zu der');
  }

  function normalizeAnswer(str: string): string {
    if (!str) return '';
    const cleaned = str
      .toLowerCase()
      .trim()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
      .replace(/\s+/g, ' ');
    return expandContractions(cleaned);
  }

  onMount(async () => {
    // 1. Standalone app detection
    if (typeof window !== 'undefined') {
      isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      showInstallButton = !isStandalone;
    }

    // 2. Service Worker registration for offline & PWA standalone caching
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw-german-cases.js', { scope: '/projects/german-cases-trainer/' }).catch((err) => {
        console.warn('SW registration failed:', err);
      });
    }

    // 3. Load user progress & cards from storage
    userStats = loadUserStats();
    cardsMap = loadCardsMap();
    checkDailyReset();
    if (typeof window !== 'undefined') {
      try {
        isMinimalMode = localStorage.getItem('cases_trainer_minimal_mode') === 'true';
      } catch (e) {}
    }

    const handleVisibilityOrFocus = () => {
      checkDailyReset();
    };
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    // 4. PWA install prompt detection
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      installPromptEvent = e;
      showInstallButton = true;
    });

    window.addEventListener('appinstalled', () => {
      showInstallButton = false;
      isStandalone = true;
    });

    // 5. Load generated exercises dataset
    await loadExercisesData();
  });

  async function loadExercisesData() {
    isLoadingData = true;
    try {
      // Dynamic import: prefer top4000 dataset, fallback to top1000
      const modules4000 = import.meta.glob('./data/top4000_cases.json', { eager: true });
      const mod4000: any = Object.values(modules4000)[0];
      if (mod4000 && Array.isArray(mod4000.default || mod4000) && (mod4000.default || mod4000).length > 0) {
        allExercises = mod4000.default || mod4000;
      } else {
        const modules1000 = import.meta.glob('./data/top1000_cases.json', { eager: true });
        const mod1000: any = Object.values(modules1000)[0];
        if (mod1000 && Array.isArray(mod1000.default || mod1000)) {
          allExercises = mod1000.default || mod1000;
        }
      }
    } catch (e) {
      console.warn('Dataset konnte nicht geladen werden, versuche HTTP fetch:', e);
    }

    if (allExercises.length === 0) {
      try {
        let res = await fetch('/src/routes/projects/german-cases-trainer/data/top4000_cases.json');
        if (!res.ok) {
          res = await fetch('/src/routes/projects/german-cases-trainer/data/top1000_cases.json');
        }
        if (res.ok) {
          allExercises = await res.json();
        }
      } catch (err) {
        console.error('Konnte Datensatz nicht laden:', err);
      }
    }

    try {
      const meaningsMod = import.meta.glob('./data/noun_meanings.json', { eager: true });
      const mMod: any = Object.values(meaningsMod)[0];
      if (mMod && typeof (mMod.default || mMod) === 'object') {
        nounMeaningsMap = mMod.default || mMod;
      }
    } catch (e) {
      console.warn('Fehler beim Laden von noun_meanings.json:', e);
    }

    isLoadingData = false;
    applyFilterAndRebuildQueue();
  }

  function switchTab(tab: 'new' | 'review' | 'words') {
    activeTab = tab;
    if (tab !== 'words') {
      applyFilterAndRebuildQueue();
    }
  }

  function shuffleQueue(ids: string[]): string[] {
    if (ids.length <= 1) return [...ids];
    
    // 1. Fisher-Yates random shuffle
    const shuffled = [...ids];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // 2. Interleave: ensure consecutive cards don't test the same baseNoun
    const exMap = new Map<string, CaseExercise>();
    for (const ex of allExercises) {
      exMap.set(ex.id, ex);
    }

    const result: string[] = [];
    const pool = [...shuffled];

    while (pool.length > 0) {
      const lastItem = result.length > 0 ? exMap.get(result[result.length - 1]) : null;
      let foundIdx = pool.findIndex(id => {
        const item = exMap.get(id);
        return !lastItem || !item || item.baseNoun !== lastItem.baseNoun;
      });

      if (foundIdx === -1) {
        foundIdx = 0;
      }

      result.push(pool.splice(foundIdx, 1)[0]);
    }

    return result;
  }

  function toggleMinimalMode() {
    isMinimalMode = !isMinimalMode;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('cases_trainer_minimal_mode', String(isMinimalMode));
      } catch (e) {}
    }
  }

  function startDailyWorkout() {
    const { stats, didReset } = checkAndResetDailyProgress(userStats);
    if (didReset) {
      userStats = { ...stats };
      applyFilterAndRebuildQueue();
    }
  }

  function checkDailyReset() {
    const { stats, didReset } = checkAndResetDailyProgress(userStats);
    if (didReset) {
      userStats = { ...stats };
      applyFilterAndRebuildQueue();
    }
  }

  function applyFilterAndRebuildQueue() {
    checkDailyReset();

    let filtered = [...allExercises];
    if (selectedTierFilter !== 'all') {
      filtered = filtered.filter(e => e.category === selectedTierFilter);
    }
    if (selectedCaseFilter !== 'all') {
      filtered = filtered.filter(e => e.case === selectedCaseFilter);
    }
    if (userStats.skipPeopleAndProfessions) {
      filtered = filtered.filter(e => !isPersonOrProfession(e.baseNoun));
    }
    filteredExercises = filtered;

    const now = Date.now();
    const currentDueIds = filteredExercises
      .filter(e => {
        const c = cardsMap[e.id];
        return c && c.state !== 'new' && c.state !== 'mastered' && c.due <= now;
      })
      .map(e => e.id);

    const currentNewExercises = filteredExercises.filter(e => {
      // Don't queue words that were already finished today
      if (userStats.todayWordIds && userStats.todayWordIds.includes(e.wordId)) {
        return false;
      }
      const c = cardsMap[e.id];
      return !c || c.state === 'new' || c.state === 'learning';
    });

    if (activeTab === 'review') {
      // TAB 2: Wiederholen -> UNBEGRENZT & GEMISCHT!
      sessionQueue = shuffleQueue(currentDueIds);
    } else {
      // TAB 1: Neue Wörter
      if (userStats.todayCompleted >= userStats.dailyGoal) {
        // Daily goal is reached! Do not queue more cards.
        sessionQueue = [];
      } else {
        const remainingWords = Math.max(0, userStats.dailyGoal - userStats.todayCompleted);
        const selectedWordIds = new Set<number>();
        const selectedNewCards: string[] = [];
        for (const ex of currentNewExercises) {
          if (selectedWordIds.size < remainingWords || selectedWordIds.has(ex.wordId)) {
            selectedWordIds.add(ex.wordId);
            selectedNewCards.push(ex.id);
          }
        }
        sessionQueue = shuffleQueue(selectedNewCards);
      }
    }

    currentExerciseIndex = 0;
    resetCardState();
  }

  function checkAndRecordWordCompletion(wordId: number) {
    if (!userStats.todayWordIds) {
      userStats.todayWordIds = [];
    }
    if (userStats.todayWordIds.includes(wordId)) {
      return; // Already counted as finished today
    }

    // Check relevant exercises for this noun
    const relevantExercises = selectedCaseFilter === 'all' 
      ? allExercises.filter(e => e.wordId === wordId) 
      : filteredExercises.filter(e => e.wordId === wordId);

    // If 'all' cases are selected, the noun must have all 3 cases (nominativ, akkusativ, dativ)
    if (relevantExercises.length === 0 || (selectedCaseFilter === 'all' && relevantExercises.length < 3)) {
      return;
    }

    const now = Date.now();
    const relevantIds = new Set(relevantExercises.map(e => e.id));

    // 1. Must not have any pending repetitions waiting in the remaining sessionQueue
    const hasPendingInQueue = sessionQueue.slice(currentExerciseIndex + 1).some(id => relevantIds.has(id));
    if (hasPendingInQueue) {
      return; // A failed sentence for this word is still waiting to be repeated!
    }

    // 2. A word is complete only if ALL its exercises have been correctly completed ('review' with due in future, or 'mastered')
    // Cards with state 'learning' (failed/again) or 'new' do NOT count as done!
    const allDone = relevantExercises.every(ex => {
      const card = cardsMap[ex.id];
      if (!card) return false;
      if (card.state === 'mastered') return true;
      if (card.state === 'review' && card.due > now) return true;
      return false;
    });

    if (allDone) {
      userStats.todayWordIds = [...userStats.todayWordIds, wordId];
      userStats.todayCompleted = userStats.todayWordIds.length;

      if (userStats.todayCompleted >= userStats.dailyGoal) {
        showConfettiCelebration = true;
        setTimeout(() => { showConfettiCelebration = false; }, 4000);
      }
    }
  }

  function recordSentenceCompletion(exerciseId: string) {
    if (!userStats.todaySentenceIds) {
      userStats.todaySentenceIds = [];
    }
    if (!userStats.todaySentenceIds.includes(exerciseId)) {
      userStats.todaySentenceIds = [...userStats.todaySentenceIds, exerciseId];
      userStats.todaySentencesCompleted = userStats.todaySentenceIds.length;
    }
  }

  function resetCardState() {
    selectedPart1 = '';
    selectedPart2 = '';
    buttonWrongPart1 = false;
    buttonWrongPart2 = false;
    isCorrect = false;
    isRevealed = false;
    showTranslation = false;
    isAutoAdvancing = false;
  }

  function handleSelectPart1(val: string) {
    if (!currentExercise || !buttonGroups || isCorrect || isRevealed || isAutoAdvancing) return;

    selectedPart1 = val;
    buttonWrongPart1 = false;

    if (buttonGroups.type === 'single') {
      const isMatch = normalizeAnswer(val) === normalizeAnswer(buttonGroups.target1);
      if (isMatch) {
        markAsCorrect();
      } else {
        buttonWrongPart1 = true;
        handleWrongSelection();
      }
    } else {
      if (selectedPart2) {
        checkTwoPartAnswer();
      }
    }
  }

  function handleSelectPart2(val: string) {
    if (!currentExercise || !buttonGroups || isCorrect || isRevealed || isAutoAdvancing) return;
    if (buttonGroups.type !== 'two-part') return;

    selectedPart2 = val;
    buttonWrongPart2 = false;

    if (selectedPart1) {
      checkTwoPartAnswer();
    }
  }

  function checkTwoPartAnswer() {
    if (!currentExercise || !buttonGroups || buttonGroups.type !== 'two-part') return;

    const chosen = normalizeAnswer(selectedPart1 + ' ' + selectedPart2);
    const target = normalizeAnswer(buttonGroups.target1 + ' ' + buttonGroups.target2);

    const matchesAccepted = (currentExercise.acceptedAnswers || []).some(a => {
      const aWords = a.trim().split(/\s+/);
      const determinerCombo = aWords.slice(0, 2).join(' ');
      return normalizeAnswer(determinerCombo) === chosen;
    });

    if (chosen === target || matchesAccepted) {
      markAsCorrect();
    } else {
      buttonWrongPart1 = normalizeAnswer(selectedPart1) !== normalizeAnswer(buttonGroups.target1);
      buttonWrongPart2 = normalizeAnswer(selectedPart2) !== normalizeAnswer(buttonGroups.target2);
      handleWrongSelection();
    }
  }

  function handleWrongSelection() {
    if (!currentExercise || isCorrect || isRevealed) return;
    isRevealed = true;

    // Update FSRS card with 'again'
    const card = cardsMap[currentExercise.id] || createNewCard(currentExercise.id);
    cardsMap[currentExercise.id] = scheduleCard(card, 'again');
    cardsMap = { ...cardsMap };
    saveCardsMap(cardsMap);

    // Re-insert current card at the end of sessionQueue so it's practiced again today
    sessionQueue = [...sessionQueue, currentExercise.id];
  }

  function markAsCorrect() {
    if (!currentExercise || isAutoAdvancing) return;
    isCorrect = true;
    isAutoAdvancing = true;

    // Update FSRS card
    const card = cardsMap[currentExercise.id] || createNewCard(currentExercise.id);
    cardsMap[currentExercise.id] = scheduleCard(card, 'good');
    cardsMap = { ...cardsMap };
    saveCardsMap(cardsMap);

    // Update user stats
    userStats.totalReviews += 1;
    userStats.correctAnswersCount += 1;
    recordSentenceCompletion(currentExercise.id);
    checkAndRecordWordCompletion(currentExercise.wordId);
    userStats = { ...userStats };
    saveUserStats(userStats);

    // Auto-advance after 350ms (smooth, delightful flow)
    setTimeout(() => {
      advanceToNextCard();
    }, 350);
  }

  function handleDontKnow() {
    if (!currentExercise || isCorrect || isRevealed) return;
    isRevealed = true;

    // Update FSRS card with 'again'
    const card = cardsMap[currentExercise.id] || createNewCard(currentExercise.id);
    cardsMap[currentExercise.id] = scheduleCard(card, 'again');
    cardsMap = { ...cardsMap };
    saveCardsMap(cardsMap);

    // Re-insert current card at the end of sessionQueue so it's practiced again today
    sessionQueue = [...sessionQueue, currentExercise.id];
  }

  function handleMastered() {
    handleMarkWordAsAlreadyKnown();
  }

  function handleMarkWordAsAlreadyKnown(targetWordId?: number) {
    const wordId = targetWordId ?? currentExercise?.wordId;
    if (!wordId) return;

    const exercisesForWord = allExercises.filter(e => e.wordId === wordId);

    for (const ex of exercisesForWord) {
      const card = cardsMap[ex.id] || createNewCard(ex.id);
      card.state = 'mastered';
      card.stability = Infinity;
      card.due = Infinity;
      card.isAlreadyKnown = true;
      cardsMap[ex.id] = card;
      recordSentenceCompletion(ex.id);
    }

    // Remove any remaining sentences for this word from the current sessionQueue
    const exerciseIds = new Set(exercisesForWord.map(e => e.id));
    sessionQueue = sessionQueue.filter(id => !exerciseIds.has(id));

    cardsMap = { ...cardsMap };
    saveCardsMap(cardsMap);

    checkAndRecordWordCompletion(wordId);
    userStats.totalMastered += 1;
    userStats = { ...userStats };
    saveUserStats(userStats);

    if (!targetWordId && currentExercise) {
      advanceToNextCard();
    }
  }

  function handleUnmarkAlreadyKnown(wordId: number) {
    const exercisesForWord = allExercises.filter(e => e.wordId === wordId);
    for (const ex of exercisesForWord) {
      if (cardsMap[ex.id]) {
        cardsMap[ex.id] = createNewCard(ex.id);
      }
    }
    cardsMap = { ...cardsMap };
    saveCardsMap(cardsMap);
    userStats.totalMastered = Math.max(0, userStats.totalMastered - 1);
    userStats = { ...userStats };
    saveUserStats(userStats);
  }

  function advanceToNextCard() {
    if (activeTab === 'new' && userStats.todayCompleted >= userStats.dailyGoal) {
      sessionQueue = [];
      currentExerciseIndex = 0;
      resetCardState();
      return;
    }

    if (currentExerciseIndex < sessionQueue.length - 1) {
      currentExerciseIndex += 1;
      resetCardState();
    } else {
      // Re-partition queue
      applyFilterAndRebuildQueue();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    // Space bar triggers "Ich weiß das nicht"
    if (e.code === 'Space' && !isRevealed && !isCorrect) {
      e.preventDefault();
      handleDontKnow();
      return;
    }

    // Enter when revealed moves to next card
    if (e.code === 'Enter' && isRevealed) {
      e.preventDefault();
      advanceToNextCard();
      return;
    }

    // Escape marks card as already mastered
    if (e.code === 'Escape' && !isCorrect) {
      e.preventDefault();
      handleMastered();
      return;
    }

    // Tab key toggles English translation
    if (e.code === 'Tab') {
      e.preventDefault();
      showTranslation = !showTranslation;
      return;
    }

    // Number keys 1-6 for Button Mode
    if (buttonGroups && !isCorrect && !isRevealed) {
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 6) {
        e.preventDefault();
        if (buttonGroups.type === 'single') {
          const opt = buttonGroups.group1[num - 1];
          if (opt) handleSelectPart1(opt);
        } else {
          // If part1 not yet selected, pick part1; if part1 selected, pick part2!
          if (!selectedPart1) {
            const opt1 = buttonGroups.group1[num - 1];
            if (opt1) handleSelectPart1(opt1);
          } else {
            const opt2 = buttonGroups.group2[num - 1];
            if (opt2) handleSelectPart2(opt2);
          }
        }
        return;
      }

      // Backspace to undo selection
      if (e.code === 'Backspace') {
        if (selectedPart2) {
          e.preventDefault();
          selectedPart2 = '';
        } else if (selectedPart1) {
          e.preventDefault();
          selectedPart1 = '';
        }
      }
    }
  }

  async function handleInstallPwa() {
    if (installPromptEvent) {
      installPromptEvent.prompt();
      const choiceResult = await installPromptEvent.userChoice;
      if (choiceResult.outcome === 'accepted') {
        showInstallButton = false;
      }
      installPromptEvent = null;
    } else {
      showSettingsModal = true;
    }
  }

  function handleResetAllProgress() {
    clearAllProgress();
    userStats = loadUserStats();
    cardsMap = {};
    showResetConfirm = false;
    showSettingsModal = false;
    resetSuccessToast = true;
    setTimeout(() => { resetSuccessToast = false; }, 3500);
    applyFilterAndRebuildQueue();
  }

  function handleLearnMoreWords(count: number = 10) {
    userStats.dailyGoal = (userStats.dailyGoal || 25) + count;
    saveUserStats(userStats);
    userStats = { ...userStats };
    selectedCaseFilter = 'all';
    applyFilterAndRebuildQueue();
  }

  function getNounDisplay(ex: CaseExercise): string {
    const art = ex.gender === 'm' ? 'der' : ex.gender === 'f' ? 'die' : ex.gender === 'n' ? 'das' : 'die';
    const gLabel = ex.gender === 'm' ? 'm' : ex.gender === 'f' ? 'f' : ex.gender === 'n' ? 'n' : 'Pl.';
    return `${art} ${ex.baseNoun} (${gLabel})`;
  }

  function formatTierName(category?: string): string {
    switch (category) {
      case 'top1000': return 'Top 1000';
      case 'top2000': return 'Top 2000';
      case 'top3000': return 'Top 3000';
      case 'top4000': return 'Top 4000';
      default: return 'Top 1000';
    }
  }

  function getTierBadgeStyle(category?: string): string {
    switch (category) {
      case 'top1000':
        return 'bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40';
      case 'top2000':
        return 'bg-sky-50/90 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/40';
      case 'top3000':
        return 'bg-violet-50/90 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/40';
      case 'top4000':
        return 'bg-amber-50/90 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
    }
  }

  function getCaseBadgeStyle(c: GrammarCase): string {
    switch (c) {
      case 'nominativ':
        return 'bg-sky-100/90 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300';
      case 'akkusativ':
        return 'bg-amber-100/90 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300';
      case 'dativ':
        return 'bg-violet-100/90 text-violet-900 dark:bg-violet-950/60 dark:text-violet-300';
      case 'genitiv':
        return 'bg-emerald-100/90 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300';
    }
  }

  function getDeterminerHint(ex: CaseExercise): string {
    if (ex.determinerHint) return ex.determinerHint;
    const firstWord = (ex.targetAnswer || '').trim().split(/\s+/)[0]?.toLowerCase();
    if (['der', 'die', 'das', 'den', 'dem', 'des'].includes(firstWord)) return '(der, die, das, dem, den, des)';
    if (['ein', 'eine', 'einen', 'einem', 'einer', 'eines'].includes(firstWord)) return '(ein, einem, einer, eines)';
    if (['mein', 'meine', 'meinen', 'meinem', 'meiner', 'meines', 'unser', 'dein', 'sein', 'ihr'].some(p => firstWord.startsWith(p))) return '(mein, meiner, meinem, meine)';
    if (firstWord.startsWith('dies')) return '(dieser, diese, diesem, diesen)';
    if (firstWord.startsWith('solch')) return '(solche, solcher, solches, solchem)';
    if (firstWord.startsWith('ander')) return '(andere, anderer, anderes, anderem)';
    if (firstWord.startsWith('kein')) return '(kein, keine, keinem, keiner)';
    if (firstWord.startsWith('jed')) return '(jeder, jede, jedem, jeden)';
    return '(der, die, das / ein, mein, solch...)';
  }
</script>

<svelte:head>
  <title>Deutscher Kasus-Trainer | river.berlin</title>
  <meta name="description" content="Minimalistischer, blitzschneller Kasus-Trainer für Nominativ, Akkusativ, Dativ & Genitiv mit Spaced-Repetition und automatischer Satzvervollständigung." />
  <link rel="manifest" href="/manifest-german-cases.json" />
  <meta name="theme-color" content="#6366f1" />
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
  <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
  <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Kasus Trainer" />
  <meta name="application-name" content="Kasus Trainer" />
</svelte:head>

<svelte:window on:keydown={handleKeydown} />

<div class="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 pt-2 pb-6 px-2.5 sm:pt-6 sm:px-6 font-sans transition-colors duration-200 flex flex-col justify-between select-none">
  
  <div class="max-w-3xl w-full mx-auto space-y-2.5 sm:space-y-5">

    <!-- Top Header & Minimal Navigation -->
    <header class="flex items-center justify-between gap-3 flex-wrap">
      <div class="flex items-center gap-2">
        <a 
          href="/" 
          class="text-xs font-semibold text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
        >
          <span>←</span>
          <span>Projekte</span>
        </a>
        <span class="text-slate-300 dark:text-slate-700">/</span>
        <h1 class="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-300">
          Kasus-Trainer
        </h1>
      </div>

      <!-- Header actions: Install button, Streak, Settings -->
      <div class="flex items-center gap-2">
        {#if showInstallButton}
          <button
            type="button"
            class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
            on:click={handleInstallPwa}
            title="Als eigenständige App auf dem Gerät installieren"
          >
            App installieren
          </button>
        {/if}

        <!-- Streak Badge (Minimal, no emoji, no border) -->
        <div class="inline-flex items-center px-3 py-1 rounded-full bg-amber-100/70 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 text-xs font-semibold">
          <span>{userStats.streakDays} {userStats.streakDays === 1 ? 'Tag' : 'Tage'} Streak</span>
        </div>

        <!-- Clean SVG Settings Button without background -->
        <button
          type="button"
          class="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer active:scale-95"
          on:click={() => showSettingsModal = true}
          title="Einstellungen"
          aria-label="Einstellungen"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </header>

    <!-- Mode Tabs: "Neue Wörter" vs "Wiederholen" vs "Wörter" (Minimalist, no borders, no emojis) -->
    <nav class="flex items-center justify-center p-1 sm:p-1.5 bg-slate-100 dark:bg-slate-800/70 rounded-xl sm:rounded-2xl max-w-xl mx-auto shadow-2xs gap-1">
      <button
        type="button"
        class="flex-1 py-1.5 px-2.5 sm:py-2 sm:px-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer {activeTab === 'new' 
          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' 
          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}"
        on:click={() => switchTab('new')}
      >
        <span>Neue Wörter</span>
        <span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold {activeTab === 'new' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300' : 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300'}">
          {userStats.todayCompleted} / {userStats.dailyGoal}
        </span>
      </button>

      <button
        type="button"
        class="flex-1 py-1.5 px-2.5 sm:py-2 sm:px-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer {activeTab === 'review' 
          ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs' 
          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}"
        on:click={() => switchTab('review')}
      >
        <span>Wiederholen</span>
        {#if dueWordsCount > 0}
          <span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100/90 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
            {dueWordsCount}
          </span>
        {:else}
          <span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/80 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400">
            0
          </span>
        {/if}
      </button>

      <button
        type="button"
        class="flex-1 py-1.5 px-2.5 sm:py-2 sm:px-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer {activeTab === 'words' 
          ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs' 
          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}"
        on:click={() => switchTab('words')}
      >
        <span>Wörter</span>
        <span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold {activeTab === 'words' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300'}">
          {totalWordsCount}
        </span>
      </button>
    </nav>

    <!-- Prominent Progress Bar & Daily Motivation Card -->
    <section class="{isMinimalMode ? 'p-2 sm:p-2.5' : 'p-3 sm:p-5'} rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900/90 shadow-xs {isMinimalMode ? '' : 'space-y-2.5 sm:space-y-3'}">
      {#if isMinimalMode}
        <!-- Minimal Mode: Only thin progress bars without labels or percentages + toggle button -->
        <div class="flex items-center gap-3 w-full">
          <div class="flex-1 space-y-1.5">
            {#if activeTab === 'new'}
              <!-- 1. Progress Bar: Sätze geübt (thinner: h-1) -->
              <div class="w-full h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                <div 
                  class="h-full rounded-full transition-all duration-300 ease-out {sentencesPercent >= 100 ? 'bg-emerald-500' : 'bg-indigo-600 dark:bg-indigo-500'}"
                  style="width: {sentencesPercent}%;"
                ></div>
              </div>

              <!-- 2. Progress Bar: Wörter komplett (thinner: h-1) -->
              <div class="w-full h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                <div 
                  class="h-full rounded-full transition-all duration-500 ease-out {wordsPercent >= 100 ? 'bg-emerald-500' : 'bg-purple-600 dark:bg-purple-500'}"
                  style="width: {wordsPercent}%;"
                ></div>
              </div>
            {:else if activeTab === 'review'}
              <!-- Progress Bar: Wiederholen (thinner: h-1) -->
              <div class="w-full h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                <div 
                  class="h-full rounded-full transition-all duration-500 ease-out {dueWordsCount === 0 ? 'bg-emerald-500' : 'bg-amber-500'}"
                  style="width: {dueWordsCount === 0 ? 100 : Math.min(100, Math.round(((currentExerciseIndex) / Math.max(1, sessionQueue.length)) * 100))}%;"
                ></div>
              </div>
            {:else}
              <!-- Progress Bar: Wörter (thinner: h-1 multi-segment) -->
              <div class="w-full h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                <div class="h-full bg-emerald-500" style="width: {totalWordsCount > 0 ? (masteredWordsCount / totalWordsCount) * 100 : 0}%;"></div>
                <div class="h-full bg-amber-500" style="width: {totalWordsCount > 0 ? (dueWordsCountInList / totalWordsCount) * 100 : 0}%;"></div>
                <div class="h-full bg-indigo-500" style="width: {totalWordsCount > 0 ? (learningWordsCount / totalWordsCount) * 100 : 0}%;"></div>
              </div>
            {/if}
          </div>

          <!-- Switch back to standard mode button -->
          <button
            type="button"
            class="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all cursor-pointer"
            on:click={toggleMinimalMode}
            title="Standard-Modus wiederherstellen"
          >
            <svg class="w-3.5 h-3.5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" />
            </svg>
            <span>Standard</span>
          </button>
        </div>
      {:else}
        {#if activeTab === 'new'}
          <!-- TAB 1: Neue Wörter (2 Progress Bars: Sätze & Wörter) -->
          <div class="space-y-3.5">
            <!-- 1. Progress Bar: Sätze geübt (Sofortiges Feedback nach jedem Satz) -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between text-xs">
                <div class="flex items-center gap-1.5 sm:gap-2">
                  <span class="font-bold text-slate-800 dark:text-slate-200">Sätze geübt</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                    {userStats.todaySentencesCompleted || 0} / {dailySentencesGoal} Sätze
                  </span>
                  <button
                    type="button"
                    class="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors p-0.5"
                    on:click={() => showInfoModal = true}
                    title="Wie funktioniert das Zielsystem?"
                    aria-label="Info anzeigen"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
                <div class="text-xs font-bold {sentencesPercent >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}">
                  {sentencesPercent}%
                </div>
              </div>
              <!-- Progress Bar: Sätze -->
              <div class="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                <div 
                  class="h-full rounded-full transition-all duration-300 ease-out {sentencesPercent >= 100 ? 'bg-emerald-500' : 'bg-indigo-600 dark:bg-indigo-500'}"
                  style="width: {sentencesPercent}%;"
                ></div>
              </div>
            </div>

            <!-- 2. Progress Bar: Ganze Wörter abgeschlossen (Alle Fälle gemeistert) -->
            <div class="space-y-1.5 pt-0.5">
              <div class="flex items-center justify-between text-xs">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-slate-800 dark:text-slate-200">Wörter komplett</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                    {userStats.todayCompleted} / {userStats.dailyGoal} Wörter
                  </span>
                </div>
                <div class="text-xs font-bold {wordsPercent >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-purple-600 dark:text-purple-400'}">
                  {wordsPercent}%
                </div>
              </div>
              <!-- Progress Bar: Wörter -->
              <div class="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                <div 
                  class="h-full rounded-full transition-all duration-500 ease-out {wordsPercent >= 100 ? 'bg-emerald-500' : 'bg-purple-600 dark:bg-purple-500'}"
                  style="width: {wordsPercent}%;"
                ></div>
              </div>
            </div>
          </div>
        {:else if activeTab === 'review'}
          <!-- TAB 2: Wiederholen (Unbegrenzt) -->
          <div class="flex items-center justify-between text-xs sm:text-sm gap-2">
            <div class="flex items-center gap-2">
              <span class="font-bold text-slate-800 dark:text-slate-200">Wiederholungen</span>
              <span class="px-2 py-0.5 rounded-full text-[11px] font-bold {dueWordsCount === 0 ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'}">
                {dueWordsCount === 0 ? 'Alles erledigt' : `${dueWordsCount} ${dueWordsCount === 1 ? 'Wort' : 'Wörter'} fällig`}
              </span>
            </div>
            <div class="text-xs font-bold {dueWordsCount === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}">
              {dueWordsCount === 0 ? '100%' : `${sessionQueue.length > 0 ? currentExerciseIndex + 1 : 0} / ${sessionQueue.length}`}
            </div>
          </div>

          <!-- Animated Progress Bar for Reviews -->
          <div class="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
            <div 
              class="h-full rounded-full transition-all duration-500 ease-out {dueWordsCount === 0 ? 'bg-emerald-500' : 'bg-amber-500'}"
              style="width: {dueWordsCount === 0 ? 100 : Math.min(100, Math.round(((currentExerciseIndex) / Math.max(1, sessionQueue.length)) * 100))}%;"
            ></div>
          </div>
        {:else}
          <!-- TAB 3: Wörter (Übersicht) -->
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-2">
                <span class="font-bold text-slate-800 dark:text-slate-200">Wortschatz-Fortschritt</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  {masteredWordsCount} / {totalWordsCount} Wörter gemeistert
                </span>
              </div>
              <div class="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {totalWordsCount > 0 ? Math.round((masteredWordsCount / totalWordsCount) * 100) : 0}%
              </div>
            </div>

            <!-- Multi-segment progress bar (Mastered: Green, Due: Amber, Learning: Indigo) -->
            <div class="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
              <div 
                class="h-full bg-emerald-500 transition-all duration-500" 
                style="width: {totalWordsCount > 0 ? (masteredWordsCount / totalWordsCount) * 100 : 0}%;"
                title="Gemeistert: {masteredWordsCount}"
              ></div>
              <div 
                class="h-full bg-amber-500 transition-all duration-500" 
                style="width: {totalWordsCount > 0 ? (dueWordsCountInList / totalWordsCount) * 100 : 0}%;"
                title="Fällig: {dueWordsCountInList}"
              ></div>
              <div 
                class="h-full bg-indigo-500 transition-all duration-500" 
                style="width: {totalWordsCount > 0 ? (learningWordsCount / totalWordsCount) * 100 : 0}%;"
                title="Beim Lernen: {learningWordsCount}"
              ></div>
            </div>
          </div>
        {/if}

        <!-- Mini Stats Row (Clean, no harsh borders) -->
        <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 flex-wrap gap-2">
          <div class="flex items-center gap-3 flex-wrap">
            <span>Fällig: <strong class="text-amber-600 dark:text-amber-400">{dueWordsCount} {dueWordsCount === 1 ? 'Wort' : 'Wörter'}</strong> <span class="text-[10px] opacity-70">({dueQueue.length} Sätze)</span></span>
            <span>Neu: <strong class="text-slate-700 dark:text-slate-300">{newWordsCount} {newWordsCount === 1 ? 'Wort' : 'Wörter'}</strong> <span class="text-[10px] opacity-70">({newQueue.length} Sätze)</span></span>
            <span>Gemeistert: <strong class="text-slate-700 dark:text-slate-300">{masteredWordsCount}</strong></span>
            <span>Verbleibend: <strong class="text-slate-700 dark:text-slate-300">{remainingWordsCount}</strong></span>

            <!-- Button on the right of stats to enter minimal mode -->
            <button
              type="button"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all cursor-pointer"
              on:click={toggleMinimalMode}
              title="Minimal-Modus für mehr Konzentration aktivieren"
            >
              <svg class="w-3 h-3 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              <span>Minimal</span>
            </button>
          </div>
        </div>
      {/if}
    </section>

    <!-- Main Practice Card (High Focus & Minimalist) -->
    <main class="relative">
      {#if isLoadingData}
        <div class="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 shadow-xs space-y-3">
          <div class="inline-block animate-spin w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400">Lade Kasus-Übungen...</p>
        </div>

      {:else if activeTab === 'words'}
        <!-- Comprehensive Words Directory & Vocabulary Explorer -->
        <div class="space-y-3.5 animate-in fade-in duration-200">
          <!-- 1. Interactive Metric Cards (Click to filter by status or remaining count) -->
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-2.5">
            <!-- Card: Alle Nomen -->
            <button
              type="button"
              class="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all text-left cursor-pointer border {wordStatusFilter === 'all' ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-500/20' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}"
              on:click={() => { wordStatusFilter = 'all'; wordsPage = 1; }}
            >
              <div class="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">Gesamt</div>
              <div class="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{totalWordsCount}</div>
              <div class="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Alle Wörter</div>
            </button>

            <!-- Card: Noch offen / Verbleibend (Remaining in total) -->
            <button
              type="button"
              class="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all text-left cursor-pointer border {wordStatusFilter === 'remaining' ? 'bg-slate-100 dark:bg-slate-800 border-slate-400 dark:border-slate-600 ring-2 ring-slate-400/20' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}"
              on:click={() => { wordStatusFilter = 'remaining'; wordsPage = 1; }}
            >
              <div class="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">Noch offen</div>
              <div class="text-base sm:text-xl font-extrabold text-slate-700 dark:text-slate-200 mt-0.5">{remainingWordsCount}</div>
              <div class="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Verbleibend</div>
            </button>

            <!-- Card: Beim Lernen (Currently learning) -->
            <button
              type="button"
              class="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all text-left cursor-pointer border {wordStatusFilter === 'learning' ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-500/20' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}"
              on:click={() => { wordStatusFilter = 'learning'; wordsPage = 1; }}
            >
              <div class="text-[10px] sm:text-xs font-semibold text-indigo-600 dark:text-indigo-400">Beim Lernen</div>
              <div class="text-base sm:text-xl font-extrabold text-indigo-700 dark:text-indigo-300 mt-0.5">{learningWordsCount}</div>
              <div class="text-[10px] text-indigo-500/80 dark:text-indigo-400/70 mt-0.5">In Bearbeitung</div>
            </button>

            <!-- Card: Fällig zur Wiederholung (Needs to revise) -->
            <button
              type="button"
              class="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all text-left cursor-pointer border {wordStatusFilter === 'due' ? 'bg-amber-50/80 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 ring-2 ring-amber-500/20' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}"
              on:click={() => { wordStatusFilter = 'due'; wordsPage = 1; }}
            >
              <div class="text-[10px] sm:text-xs font-semibold text-amber-600 dark:text-amber-400">Fällig</div>
              <div class="text-base sm:text-xl font-extrabold text-amber-700 dark:text-amber-300 mt-0.5">{dueWordsCountInList}</div>
              <div class="text-[10px] text-amber-600/80 dark:text-amber-400/70 mt-0.5">Zu wiederholen</div>
            </button>

            <!-- Card: Gemeistert (Mastered in Training) -->
            <button
              type="button"
              class="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all text-left cursor-pointer border {wordStatusFilter === 'mastered' ? 'bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/20' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}"
              on:click={() => { wordStatusFilter = 'mastered'; wordsPage = 1; }}
            >
              <div class="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400">Gemeistert</div>
              <div class="text-base sm:text-xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">{masteredWordsCount}</div>
              <div class="text-[10px] text-emerald-600/80 dark:text-emerald-400/70 mt-0.5">Im Training</div>
            </button>

            <!-- Card: Bereits bekannt (Already Known / Kenne ich schon) -->
            <button
              type="button"
              class="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all text-left cursor-pointer border {wordStatusFilter === 'already_known' ? 'bg-teal-50/80 dark:bg-teal-950/50 border-teal-300 dark:border-teal-700 ring-2 ring-teal-500/20' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}"
              on:click={() => { wordStatusFilter = 'already_known'; wordsPage = 1; }}
            >
              <div class="text-[10px] sm:text-xs font-semibold text-teal-600 dark:text-teal-400">Bereits bekannt</div>
              <div class="text-base sm:text-xl font-extrabold text-teal-700 dark:text-teal-300 mt-0.5">{alreadyKnownWordsCount}</div>
              <div class="text-[10px] text-teal-600/80 dark:text-teal-400/70 mt-0.5">Kenne ich schon</div>
            </button>
          </div>

          <!-- 2. Search & Controls Bar -->
          <div class="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 shadow-xs border border-slate-100 dark:border-slate-800 space-y-2.5">
            <div class="relative">
              <input
                type="text"
                bind:value={wordsSearchQuery}
                on:input={() => wordsPage = 1}
                placeholder="Wort suchen (z. B. Raum, room, Katze, Buch)..."
                class="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0118 0z" />
              </svg>
              {#if wordsSearchQuery}
                <button
                  type="button"
                  class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1"
                  on:click={() => { wordsSearchQuery = ''; wordsPage = 1; }}
                  aria-label="Suche löschen"
                >
                  ✕
                </button>
              {/if}
            </div>

            <!-- Filters & Sort Options -->
            <div class="flex items-center justify-between gap-2 flex-wrap text-xs">
              <div class="flex items-center gap-2 flex-wrap">
                <!-- Tier Filter -->
                <select
                  bind:value={wordTierFilter}
                  on:change={() => wordsPage = 1}
                  class="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none font-medium text-xs focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">Alle Tiers</option>
                  <option value="top1000">Top 1000</option>
                  <option value="top2000">Top 2000</option>
                  <option value="top3000">Top 3000</option>
                  <option value="top4000">Top 4000</option>
                </select>

                <!-- Gender Filter -->
                <select
                  bind:value={wordGenderFilter}
                  on:change={() => wordsPage = 1}
                  class="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none font-medium text-xs focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">Alle Artikel (der/die/das)</option>
                  <option value="m">der (Maskulin)</option>
                  <option value="f">die (Feminin)</option>
                  <option value="n">das (Neutrum)</option>
                </select>
              </div>

              <div class="flex items-center gap-2 ml-auto">
                <span class="text-slate-400 text-[11px] hidden sm:inline">Sortierung:</span>
                <select
                  bind:value={wordSortOrder}
                  class="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none font-medium text-xs focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="az">Alphabetisch (A–Z)</option>
                  <option value="za">Alphabetisch (Z–A)</option>
                  <option value="reps_desc">Meiste Wiederholungen nötig</option>
                  <option value="reps_asc">Wenigste Wiederholungen nötig</option>
                  <option value="tier">Häufigkeit (Top 1000 zuerst)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Active Filter & Count Line -->
          <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
            <div>
              <span>Zeige <strong>{paginatedWordsList.length}</strong> von <strong>{filteredWordsList.length}</strong> Wörtern</span>
              {#if wordStatusFilter !== 'all'}
                <span class="ml-1 text-indigo-600 dark:text-indigo-400 font-semibold">
                  (Filter: {wordStatusFilter === 'remaining' ? 'Noch offen' : wordStatusFilter === 'learning' ? 'Beim Lernen' : wordStatusFilter === 'due' ? 'Fällig' : 'Gemeistert'})
                </span>
              {/if}
            </div>
            {#if wordStatusFilter !== 'all' || wordTierFilter !== 'all' || wordGenderFilter !== 'all' || wordsSearchQuery}
              <button
                type="button"
                class="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer text-xs font-semibold"
                on:click={() => {
                  wordStatusFilter = 'all';
                  wordTierFilter = 'all';
                  wordGenderFilter = 'all';
                  wordsSearchQuery = '';
                  wordsPage = 1;
                }}
              >
                Filter zurücksetzen
              </button>
            {/if}
          </div>

          <!-- 3. Word Cards List -->
          {#if paginatedWordsList.length === 0}
            <div class="p-10 text-center rounded-3xl bg-white dark:bg-slate-900 shadow-xs space-y-2 border border-slate-100 dark:border-slate-800">
              <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">Keine Wörter gefunden</p>
              <p class="text-xs text-slate-400">Versuche die Filter zurückzusetzen oder einen anderen Begriff einzugeben.</p>
            </div>
          {:else}
            <div class="space-y-2.5">
              {#each paginatedWordsList as word (word.wordId)}
                {@const statusBadge = getWordStatusBadge(word.status)}
                {@const genderPill = formatGenderPill(word.gender)}
                {@const isExpanded = expandedWordId === word.wordId}
                <div class="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 shadow-xs border border-slate-100 dark:border-slate-800/80 hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all space-y-2.5">
                  <!-- Top Row: German Dictionary Form, Gender, Tier & Status -->
                  <div class="flex items-start justify-between gap-2 flex-wrap">
                    <div class="space-y-0.5">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                          {word.originalWord}
                        </span>
                        <span class="px-2 py-0.5 rounded-md text-[10px] font-bold border {genderPill.style}">
                          {genderPill.label}
                        </span>
                        <span class="px-2 py-0.5 rounded-md text-[10px] font-bold {getTierBadgeStyle(word.category)}">
                          {formatTierName(word.category)}
                        </span>
                      </div>
                      {#if word.meaning}
                        <div class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 italic">
                          {word.meaning}
                        </div>
                      {/if}
                    </div>

                    <!-- Status Badge -->
                    <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0 {statusBadge.style}">
                      {statusBadge.label}
                    </span>
                  </div>

                  <!-- Mastery & Revisions Remaining Label (Core feature) -->
                  <div class="p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                    <div class="flex items-center gap-1.5 text-xs sm:text-sm">
                      {#if word.status === 'already_known'}
                        <span class="font-bold text-teal-700 dark:text-teal-300 flex items-center gap-1">
                          <span>🌟</span>
                          <span>Bereits bekannt (Kenne ich schon)</span>
                        </span>
                      {:else if word.status === 'mastered'}
                        <span class="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <span>⭐</span>
                          <span>Im Training gemeistert – 0× wiederholen nötig</span>
                        </span>
                      {:else}
                        <span class="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span class="text-indigo-600 dark:text-indigo-400">🔄</span>
                          <span>Noch <strong class="text-indigo-600 dark:text-indigo-400">{word.maxRepsNeeded}×</strong> wiederholen bis gemeistert</span>
                        </span>
                      {/if}
                    </div>

                    <!-- Case Progress Breakdown Chips (Nominativ, Akkusativ, Dativ) -->
                    <div class="flex items-center gap-1.5 text-[11px] font-bold">
                      {#each ['nominativ', 'akkusativ', 'dativ'] as c}
                        {@const info = word.caseBreakdown[c]}
                        <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold border {
                          info?.isMastered
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                            : info?.isDue
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                            : (info?.repsRemaining ?? 4) < 4
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800'
                            : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }">
                          {c.slice(0, 3).toUpperCase()}: {info?.isMastered ? '✓' : `${info?.repsRemaining ?? 4}×`}
                        </span>
                      {/each}
                    </div>
                  </div>

                  <!-- Actions Row: Expand Sentences + Quick Known Toggle + Practice Button -->
                  <div class="flex items-center justify-between gap-2 pt-0.5 flex-wrap">
                    <button
                      type="button"
                      class="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium cursor-pointer transition-colors flex items-center gap-1"
                      on:click={() => toggleWordExpand(word.wordId)}
                    >
                      <span>{isExpanded ? 'Kasus-Sätze verbergen ▲' : '3 Beispielsätze ansehen ▼'}</span>
                    </button>

                    <div class="flex items-center gap-1.5 ml-auto">
                      {#if word.status === 'already_known'}
                        <button
                          type="button"
                          class="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium text-xs transition-all cursor-pointer active:scale-95 flex items-center gap-1"
                          on:click={() => handleUnmarkAlreadyKnown(word.wordId)}
                          title="Bereits-bekannt-Status aufheben und normal üben"
                        >
                          <span>↺ Zurücksetzen</span>
                        </button>
                      {:else if word.status !== 'mastered'}
                        <button
                          type="button"
                          class="px-2.5 py-1 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/50 font-medium text-xs transition-all cursor-pointer active:scale-95 flex items-center gap-1"
                          on:click={() => handleMarkWordAsAlreadyKnown(word.wordId)}
                          title="Als bereits bekannt markieren (nie wieder abfragen)"
                        >
                          <span>✓ Kenne ich schon</span>
                        </button>
                      {/if}

                      <button
                        type="button"
                        class="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                        on:click={() => practiceSpecificWord(word.wordId)}
                        title="Diesen Begriff mit allen 3 Kasus-Sätzen üben"
                      >
                        <span>Üben</span>
                        <span>➔</span>
                      </button>
                    </div>
                  </div>

                  <!-- Expanded Sentences Preview -->
                  {#if isExpanded}
                    <div class="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2 animate-in fade-in">
                      <div class="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Kasus-Sätze für „{word.baseNoun}“
                      </div>
                      <div class="grid grid-cols-1 gap-1.5">
                        {#each word.exercises as ex}
                          {@const card = cardsMap[ex.id]}
                          {@const repsLeft = getCardRepsRemaining(card)}
                          <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                            <div class="flex items-center justify-between gap-2">
                              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider {getCaseBadgeStyle(ex.case)}">
                                {ex.case}
                              </span>
                              <span class="text-[10px] text-slate-400">
                                {card?.state === 'mastered' ? 'Gemeistert ✓' : card?.due && card.due <= Date.now() && card.state !== 'new' ? 'Fällig ⏳' : `Noch ${repsLeft}× wiederholen`}
                              </span>
                            </div>
                            <div class="text-slate-800 dark:text-slate-100 font-medium">
                              {ex.sentenceStart}<strong class="text-indigo-600 dark:text-indigo-400 underline decoration-indigo-300 underline-offset-2">{ex.targetAnswer}</strong>{ex.sentenceEnd || ''}
                            </div>
                            <div class="text-[11px] text-slate-400 dark:text-slate-500 italic">
                              „{ex.translation}“
                            </div>
                          </div>
                        {/each}
                      </div>
                    </div>
                  {/if}
                </div>
              {/each}

              <!-- Load More Pagination Button -->
              {#if hasMoreWords}
                <div class="pt-3 text-center">
                  <button
                    type="button"
                    class="px-6 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm transition-all cursor-pointer active:scale-95 shadow-xs"
                    on:click={() => wordsPage += 1}
                  >
                    Mehr Wörter laden ({paginatedWordsList.length} von {filteredWordsList.length}) ➔
                  </button>
                </div>
              {/if}
            </div>
          {/if}
        </div>

      {:else if !currentExercise}
        <!-- All Done State -->
        {#if activeTab === 'review'}
          <!-- Review Empty State -->
          <div class="p-10 text-center rounded-3xl bg-white dark:bg-slate-900 shadow-sm space-y-4 animate-in fade-in">
            <div class="space-y-1">
              <h2 class="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Keine fälligen Wiederholungen
              </h2>
              <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Alle deine gelernten Wörter sind im Gedächtnis aufgefrischt. Schau später wieder vorbei oder lerne neue Wörter.
              </p>
            </div>
            <div class="pt-2">
              <button
                type="button"
                class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
                on:click={() => switchTab('new')}
              >
                Zu „Neue Wörter“ wechseln ({userStats.todayCompleted}/{userStats.dailyGoal}) ➔
              </button>
            </div>
          </div>
        {:else}
          <!-- New Words Done State -->
          <div class="p-10 text-center rounded-3xl bg-white dark:bg-slate-900 shadow-sm space-y-4 animate-in fade-in">
            <div class="space-y-1">
              <h2 class="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {userStats.todayCompleted >= userStats.dailyGoal ? 'Tagesziel erreicht! 🎉' : 'Aktuelle Wörter erledigt'}
              </h2>
              <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {userStats.todayCompleted >= userStats.dailyGoal 
                  ? `Du hast dein Tagesziel von ${userStats.dailyGoal} ${userStats.dailyGoal === 1 ? 'Wort' : 'Wörtern'} für heute gemeistert.` 
                  : `Du hast heute ${userStats.todayCompleted} von ${userStats.dailyGoal} ${userStats.dailyGoal === 1 ? 'Wort' : 'Wörtern'} geübt.`}
              </p>
            </div>
            <div class="pt-2 flex items-center justify-center gap-3 flex-wrap">
              <button
                type="button"
                class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                on:click={() => handleLearnMoreWords(10)}
              >
                <span>+ 10 weitere Wörter lernen</span>
                <span>➔</span>
              </button>

              {#if userStats.dailyGoal <= 5}
                <button
                  type="button"
                  class="px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold text-xs sm:text-sm transition-all cursor-pointer active:scale-95"
                  on:click={() => handleLearnMoreWords(1)}
                >
                  + 1 Wort (Test) ➔
                </button>
              {/if}

              {#if dueWordsCount > 0}
                <button
                  type="button"
                  class="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-all cursor-pointer active:scale-95"
                  on:click={() => switchTab('review')}
                >
                  {dueWordsCount} {dueWordsCount === 1 ? 'Wort' : 'Wörter'} wiederholen ➔
                </button>
              {/if}
            </div>
          </div>
        {/if}

      {:else}
        <!-- Active Exercise Card (Clean, modern elevation, no harsh borders) -->
        <div class="p-3.5 sm:p-7 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-sm space-y-2.5 sm:space-y-5 relative transition-all duration-200 {isCorrect ? 'ring-2 ring-emerald-500 bg-emerald-50/10' : ''}">
          
          <!-- Top Row of Card: Tier Pill, Case Pill, Mode Switcher & Translation Toggle -->
          <div class="flex items-center justify-between gap-2 flex-wrap {isMinimalMode ? 'min-h-[22px]' : ''}">
            <div class="flex items-center gap-1.5">
              {#if !isMinimalMode}
                <!-- Tier Badge -->
                <span class="px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold tracking-tight {getTierBadgeStyle(currentExercise.category)}">
                  {formatTierName(currentExercise.category)}
                </span>

                <span class="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider {getCaseBadgeStyle(currentExercise.case)}">
                  {currentExercise.case}
                </span>
              {/if}
            </div>

            <div class="flex items-center gap-2 ml-auto">
              <!-- Optional Translation Toggle -->
              <button
                type="button"
                class="text-[11px] sm:text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                on:click={() => showTranslation = !showTranslation}
                title="Englische Übersetzung einblenden (Tab-Taste)"
              >
                <span>{showTranslation ? 'Übersetzung verbergen' : 'Übersetzung anzeigen'}</span>
                <span class="text-[9px] sm:text-[10px] opacity-60">[{showTranslation ? 'x' : 'Tab'}]</span>
              </button>
            </div>
          </div>

          <!-- Sentence Prompt with Inline Gap and Noun -->
          <div class="space-y-1 sm:space-y-3 py-1 sm:py-2">
            <div class="text-base sm:text-xl font-bold leading-snug sm:leading-relaxed text-slate-900 dark:text-white flex flex-wrap items-baseline gap-1.5 sm:gap-2 select-text">
              {#if currentExercise.sentenceStart}
                <span>{currentExercise.sentenceStart}</span>
              {/if}
              
              <!-- Dynamic Gap Visualizer -->
              {#if isRevealed}
                <span class="text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-lg animate-in fade-in">
                  {currentExercise.targetAnswer}
                </span>
              {:else if isCorrect}
                <span class="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg animate-in fade-in">
                  {currentExercise.targetAnswer} ✓
                </span>
              {:else if buttonGroups}
                {#if buttonGroups.type === 'two-part'}
                  <span class="inline-flex items-center gap-1.5 align-baseline">
                    <span class="px-2.5 py-0.5 rounded-lg border-2 font-bold transition-all text-sm sm:text-base {selectedPart1 ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' : 'border-dashed border-slate-300 dark:border-slate-600 text-slate-400'}">
                      {selectedPart1 || '____'}
                    </span>
                    <span class="px-2.5 py-0.5 rounded-lg border-2 font-bold transition-all text-sm sm:text-base {selectedPart2 ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' : 'border-dashed border-slate-300 dark:border-slate-600 text-slate-400'}">
                      {selectedPart2 || '____'}
                    </span>
                  </span>
                {:else}
                  <span class="px-3 py-0.5 rounded-lg border-2 font-bold transition-all text-sm sm:text-base {selectedPart1 ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' : 'border-dashed border-slate-300 dark:border-slate-600 text-slate-400'}">
                    {selectedPart1 || '________'}
                  </span>
                {/if}
              {/if}

              <!-- The noun and sentenceEnd together when not yet revealed/correct -->
              {#if !isRevealed && !isCorrect}
                <span><span class="font-extrabold text-slate-900 dark:text-white">{exerciseNoun}</span>{currentExercise.sentenceEnd || ''}</span>
              {:else if currentExercise.sentenceEnd}
                <span>{currentExercise.sentenceEnd}</span>
              {/if}
            </div>

            <!-- Optional English translation if toggled -->
            {#if showTranslation && currentExercise.translation}
              <p class="text-[11px] sm:text-sm text-slate-400 dark:text-slate-500 italic">
                „{currentExercise.translation}“
              </p>
            {/if}
          </div>

          {#if buttonGroups}
            <!-- Button-Based Selection Mode -->
            <div class="pt-1 sm:pt-2 space-y-3">
              {#if buttonGroups.type === 'single'}
                <div class="space-y-1.5">
                  {#if !isMinimalMode}
                    <div class="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center">
                      {buttonGroups.group1Title}
                    </div>
                  {/if}
                  <div class="flex flex-wrap items-center justify-center gap-2">
                    {#each buttonGroups.group1 as opt, idx}
                      {@const isChosen = selectedPart1.toLowerCase() === opt.toLowerCase()}
                      {@const isTarget = opt.toLowerCase() === buttonGroups.target1.toLowerCase()}
                      <button
                        type="button"
                        disabled={isCorrect || isRevealed}
                        class="min-w-[70px] sm:min-w-[85px] py-2.5 px-3.5 rounded-2xl text-sm sm:text-base font-bold transition-all cursor-pointer active:scale-95 shadow-xs flex items-center justify-center gap-1.5 {
                          isCorrect && isChosen
                            ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                            : isRevealed && isTarget
                            ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                            : isRevealed && isChosen && buttonWrongPart1
                            ? 'bg-rose-500 text-white'
                            : isChosen
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700/60'
                        }"
                        on:click={() => handleSelectPart1(opt)}
                      >
                        <span>{opt}</span>
                        <span class="text-[10px] opacity-40 font-mono hidden sm:inline">[{idx + 1}]</span>
                      </button>
                    {/each}
                  </div>
                </div>
              {:else if buttonGroups.type === 'two-part'}
                <div class="space-y-3.5">
                  <!-- Group 1: Article -->
                  <div class="space-y-1.5">
                    {#if !isMinimalMode}
                      <div class="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center">
                        1. {buttonGroups.group1Title}
                      </div>
                    {/if}
                    <div class="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                      {#each buttonGroups.group1 as opt, idx}
                        {@const isChosen = selectedPart1.toLowerCase() === opt.toLowerCase()}
                        {@const isTarget = opt.toLowerCase() === buttonGroups.target1.toLowerCase()}
                        <button
                          type="button"
                          disabled={isCorrect || isRevealed}
                          class="min-w-[62px] sm:min-w-[76px] py-2 px-2.5 sm:px-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-95 shadow-xs flex items-center justify-center gap-1 {
                            isCorrect && isChosen
                              ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                              : isRevealed && isTarget
                              ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                              : isRevealed && isChosen && buttonWrongPart1
                              ? 'bg-rose-500 text-white'
                              : isChosen
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700/60'
                          }"
                          on:click={() => handleSelectPart1(opt)}
                        >
                          <span>{opt}</span>
                          <span class="text-[10px] opacity-40 font-mono hidden sm:inline">[{idx + 1}]</span>
                        </button>
                      {/each}
                    </div>
                  </div>

                  <!-- Group 2: Adjective / Determiner Ending -->
                  <div class="space-y-1.5">
                    {#if !isMinimalMode}
                      <div class="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center">
                        2. {buttonGroups.group2Title}
                      </div>
                    {/if}
                    <div class="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                      {#each buttonGroups.group2 as opt}
                        {@const isChosen = selectedPart2.toLowerCase() === opt.toLowerCase()}
                        {@const isTarget = opt.toLowerCase() === buttonGroups.target2.toLowerCase()}
                        <button
                          type="button"
                          disabled={isCorrect || isRevealed}
                          class="min-w-[62px] sm:min-w-[76px] py-2 px-2.5 sm:px-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-95 shadow-xs flex items-center justify-center gap-1 {
                            isCorrect && isChosen
                              ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                              : isRevealed && isTarget
                              ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                              : isRevealed && isChosen && buttonWrongPart2
                              ? 'bg-rose-500 text-white'
                              : isChosen
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700/60'
                          }"
                          on:click={() => handleSelectPart2(opt)}
                        >
                          <span>{opt}</span>
                        </button>
                      {/each}
                    </div>
                  </div>
                </div>
              {/if}
            </div>
          {/if}

          <!-- When revealed on error / reveal: Centered Weiter button placed directly ABOVE grammar explanation -->
          {#if isRevealed}
            <div class="pt-1 sm:pt-2 flex items-center justify-center animate-in fade-in">
              <button
                type="button"
                class="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold transition-all cursor-pointer flex items-center gap-2 shadow-sm active:scale-95 text-xs sm:text-sm"
                on:click={advanceToNextCard}
              >
                <span>Weiter</span>
                <span>➔</span>
                <span class="text-[10px] sm:text-xs opacity-75 font-mono">[Enter]</span>
              </button>
            </div>
          {/if}

          <!-- Explanation Pill (Shows on reveal or upon correct) -->
          {#if (isRevealed || isCorrect) && grammarBreakdown}
            <div class="p-4 sm:p-5 rounded-2xl text-xs sm:text-sm leading-relaxed space-y-3 animate-in fade-in slide-in-from-top-2 border {isCorrect ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/70 dark:border-emerald-800/40 text-emerald-950 dark:text-emerald-100' : 'bg-slate-50/90 dark:bg-slate-800/70 border-slate-200/80 dark:border-slate-700/60 text-slate-800 dark:text-slate-200'}">
              <div class="flex items-center gap-2 font-bold text-xs uppercase tracking-wider {isCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-indigo-600 dark:text-indigo-400'}">
                <span>📖 Grammatik-Regel & Erklärung</span>
              </div>
              
              <div class="space-y-2 border-l-2 pl-3 {isCorrect ? 'border-emerald-400 dark:border-emerald-600' : 'border-indigo-400 dark:border-indigo-500'}">
                <div class="font-semibold text-slate-900 dark:text-white">{grammarBreakdown.genderLine}</div>
                <div class="text-slate-600 dark:text-slate-300">{grammarBreakdown.caseLine}</div>

                {#if grammarBreakdown.whyCaseReason}
                  <div class="mt-1 p-2.5 rounded-xl {isCorrect ? 'bg-emerald-100/60 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-200 border border-emerald-200/60 dark:border-emerald-800/40' : 'bg-indigo-50/90 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-900/40'} text-xs leading-relaxed">
                    <div class="font-bold flex items-center gap-1.5 {isCorrect ? 'text-emerald-800 dark:text-emerald-300' : 'text-indigo-700 dark:text-indigo-300'}">
                      <span>💡</span>
                      <span>Warum {grammarBreakdown.caseName}?</span>
                    </div>
                    <div class="mt-0.5 opacity-95">
                      {grammarBreakdown.whyCaseReason}
                    </div>
                  </div>
                {/if}
              </div>

              {#if grammarBreakdown.patternTitle}
                <div class="pt-1 space-y-1.5">
                  <div class="font-semibold text-slate-800 dark:text-slate-200">{grammarBreakdown.patternTitle}</div>
                  <ul class="space-y-1.5 list-disc list-inside text-slate-600 dark:text-slate-300 pl-0.5">
                    {#each grammarBreakdown.patternDetails as detail}
                      <li class="leading-normal">{detail}</li>
                    {/each}
                  </ul>
                </div>
              {/if}
            </div>
          {/if}

          <!-- Card Bottom Action Bar (When in regular answering state) -->
          {#if !isRevealed && !isCorrect}
            <div class="pt-1.5 sm:pt-3 flex items-center justify-between gap-2 flex-wrap text-xs">
              
              <!-- Left: "Ich weiß das nicht" button / Hotkey info -->
              <div>
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium transition-all cursor-pointer active:scale-95"
                  on:click={handleDontKnow}
                  title="Lösung und Regel anzeigen (Leertaste)"
                >
                  <span>Ich weiß das nicht</span>
                  <span class="text-[10px] opacity-50 ml-1">[Leertaste]</span>
                </button>
              </div>

              <!-- Right: "Kenne ich schon" button (Mark as Already Known & Mastered) -->
              <div>
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-200 border border-teal-300/60 dark:border-teal-700/60 font-medium transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                  on:click={() => handleMarkWordAsAlreadyKnown()}
                  title="Dieses Nomen als bereits bekannt markieren – alle Kasus-Sätze werden übersprungen (Esc-Taste)"
                >
                  <span>Kenne ich schon</span>
                  <span class="text-[10px] opacity-60 ml-0.5">[Esc]</span>
                </button>
              </div>

            </div>
          {/if}

        </div>
      {/if}
    </main>

  </div>

</div>

<!-- Information Popup Modal ("Wie es funktioniert") -->
{#if showInfoModal}
  <div 
    class="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in"
    role="presentation"
    on:click|self={() => showInfoModal = false}
  >
    <div 
      class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 border border-slate-100 dark:border-slate-800"
      role="dialog"
      aria-modal="true"
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
            💡
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-white leading-snug">
              Wie funktioniert das Zielsystem?
            </h3>
            <p class="text-[11px] text-slate-400">Erklärung zu Sätzen, Wörtern & Wiederholungen</p>
          </div>
        </div>
        <button
          type="button"
          class="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          on:click={() => showInfoModal = false}
        >
          ✕
        </button>
      </div>

      <!-- Explanation Cards -->
      <div class="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
        <!-- 1. Sätze geübt -->
        <div class="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100/80 dark:border-indigo-900/40 space-y-1">
          <div class="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
            <span class="text-xs">✍️</span>
            <span>1. Sätze geübt (Sofortiger Fortschritt)</span>
          </div>
          <p class="text-[11px] text-slate-600 dark:text-slate-300">
            Jeder Satz, den du richtig auswählst, zählt direkt hier. So siehst du bei jedem Satz sofort deinen Fortschritt und bleibst im Fluss.
          </p>
        </div>

        <!-- 2. Wörter komplett -->
        <div class="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-100/80 dark:border-purple-900/40 space-y-1">
          <div class="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
            <span class="text-xs">🎯</span>
            <span>2. Wörter komplett (Alle Kasus gemeistert)</span>
          </div>
          <p class="text-[11px] text-slate-600 dark:text-slate-300">
            Ein deutsches Nomen hat mehrere Kasus (Nominativ, Akkusativ, Dativ & Genitiv). Erst wenn alle Kasus-Übungen zu diesem Nomen abgeschlossen oder gemeistert sind, gilt das Wort als abgeschlossen für dein Tagesziel.
          </p>
        </div>

        <!-- 3. Wiederholen (FSRS) -->
        <div class="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-100/80 dark:border-amber-900/40 space-y-1">
          <div class="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
            <span class="text-xs">🧠</span>
            <span>3. Spaced Repetition (FSRS-Algorithmus)</span>
          </div>
          <p class="text-[11px] text-slate-600 dark:text-slate-300">
            Einfache Sätze werden in immer größeren Abständen wiederholt. Schwierige Sätze oder Fehler landen automatisch im Tab <em>„Wiederholen“</em>, damit du sie fest im Langzeitgedächtnis verankerst.
          </p>
        </div>
      </div>

      <!-- Close Action -->
      <div class="pt-1">
        <button
          type="button"
          class="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all cursor-pointer shadow-xs active:scale-98"
          on:click={() => showInfoModal = false}
        >
          Alles klar, weiterlernen!
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Settings Modal Dialog -->
{#if showSettingsModal}
  <div 
    class="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in"
    role="presentation"
    on:click|self={() => { showSettingsModal = false; showResetConfirm = false; }}
  >
    <div 
      class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-md w-full max-h-[88vh] overflow-y-auto shadow-2xl space-y-5 animate-in zoom-in-95 duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-dialog-title"
    >
      
      <!-- Modal Header -->
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <h3 id="settings-dialog-title" class="text-sm font-semibold text-slate-900 dark:text-white">Einstellungen</h3>
        </div>
        <button 
          type="button"
          class="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer text-xs"
          on:click={() => { showSettingsModal = false; showResetConfirm = false; }}
        >
          ✕
        </button>
      </div>

      <!-- Setting: Daily Goal -->
      <div class="space-y-2">
        <span class="text-xs font-medium text-slate-600 dark:text-slate-400 block">
          Tagesziel (Neue Wörter pro Tag):
        </span>
        <div class="grid grid-cols-6 gap-1.5">
          {#each [1, 5, 10, 15, 20, 25] as goal}
            <button
              type="button"
              class="py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer {userStats.dailyGoal === goal 
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs' 
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700'}"
              on:click={() => {
                userStats.dailyGoal = goal;
                saveUserStats(userStats);
                userStats = { ...userStats };
                applyFilterAndRebuildQueue();
              }}
            >
              {goal}
            </button>
          {/each}
        </div>
      </div>

      <!-- Setting: Skip People and Professions -->
      <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
        <div class="space-y-0.5 pr-2">
          <label for="toggle-skip-people" class="text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer block">
            Personen & Berufe überspringen
          </label>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            Überspringt Nomen wie <em>Patient, Arzt, Bettler</em> usw., deren Geschlecht durch das biologische Geschlecht offensichtlich ist.
          </p>
        </div>
        <button
          id="toggle-skip-people"
          type="button"
          role="switch"
          aria-checked={userStats.skipPeopleAndProfessions}
          aria-label="Personen und Berufe überspringen"
          class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden {userStats.skipPeopleAndProfessions ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}"
          on:click={() => {
            userStats.skipPeopleAndProfessions = !userStats.skipPeopleAndProfessions;
            saveUserStats(userStats);
            applyFilterAndRebuildQueue();
          }}
        >
          <span
            class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out {userStats.skipPeopleAndProfessions ? 'translate-x-5' : 'translate-x-0'}"
          ></span>
        </button>
      </div>

      <!-- Browser Installation Guide (Firefox & Andere) -->
      <div class="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
        <div>
          <h4 class="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
            App installieren
          </h4>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            So nutzt du den Trainer als vollwertige Offline-App in deinem Browser:
          </p>
        </div>

        <div class="space-y-2 text-xs">
          <!-- Firefox Guide -->
          <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
            <div class="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>Firefox</span>
              <span class="text-[10px] text-slate-400 font-normal">Android & Desktop</span>
            </div>
            <p class="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              <strong>Auf Android:</strong> Tippe auf das Drei-Punkte-Menü (⋮) und wähle <strong>„Zum Startbildschirm hinzufügen“</strong> oder <strong>„Installieren“</strong>.
            </p>
            <p class="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
              <strong>Auf dem Desktop:</strong> Firefox unterstützt PWAs standardmäßig nicht nativ über ein Icon. Du kannst die Seite als Lesezeichen anheften oder die Firefox-Erweiterung <em>PWAsForFirefox</em> nutzen.
            </p>
          </div>

          <!-- Chrome / Edge / Brave Guide -->
          <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
            <div class="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>Chrome / Edge / Brave</span>
              <span class="text-[10px] text-slate-400 font-normal">PC, Mac & Android</span>
            </div>
            <p class="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              Klicke rechts in der Adressleiste auf das <strong>Installieren-Icon</strong> oder im Menü (⋮) auf <strong>„App installieren“</strong>.
            </p>
            {#if showInstallButton}
              <button
                type="button"
                class="mt-1.5 w-full py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold transition-all cursor-pointer shadow-xs active:scale-98"
                on:click={handleInstallPwa}
              >
                Direkt mit 1 Klick installieren
              </button>
            {/if}
          </div>

          <!-- Safari Guide -->
          <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
            <div class="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>Safari</span>
              <span class="text-[10px] text-slate-400 font-normal">iPhone, iPad & Mac</span>
            </div>
            <p class="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              <strong>iOS (iPhone/iPad):</strong> Tippe unten auf das <strong>Teilen-Icon</strong> (Viereck mit Pfeil nach oben) und wähle <strong>„Zum Home-Bildschirm“</strong>.
            </p>
            <p class="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
              <strong>macOS Safari:</strong> Klicke im oberen Menü auf <strong>Ablage</strong> → <strong>„Zum Dock hinzufügen…“</strong> (erstellt eine echte Standalone-Mac-App).
            </p>
          </div>

          <!-- Firefox Note -->
          <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
            <div class="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>Firefox Desktop Hinweis</span>
              <span class="text-[10px] text-slate-400 font-normal">Eigenständige Fenster</span>
            </div>
            <p class="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              Firefox Desktop hat die native Standalone-Fenster-Unterstützung (SSB) entfernt und öffnet Web-Shortcuts im normalen Browser-Tab. Für ein <strong>echtes, rahmenloses App-Fenster</strong> öffne die Seite in <strong>Chrome, Edge oder Safari</strong> („Ablage → Zum Dock hinzufügen“) oder nutze das Firefox-Addon <em>PWAsForFirefox</em>.
            </p>
          </div>
        </div>
      </div>

      <!-- Danger Zone: Reset Progress -->
      <div class="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
        <div>
          <h4 class="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            Fortschritt zurücksetzen
          </h4>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Löscht alle gelernten Karten, FSRS-Wiederholungsdaten und setzt deinen Zähler auf 0 zurück.
          </p>
        </div>

        {#if !showResetConfirm}
          <button
            type="button"
            class="w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            on:click={() => showResetConfirm = true}
          >
            Gesamten Fortschritt löschen
          </button>
        {:else}
          <!-- Confirmation Panel -->
          <div class="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 space-y-3 animate-in fade-in">
            <p class="text-xs font-medium text-rose-900 dark:text-rose-200">
              Bist du sicher? Alle Daten werden unwiderruflich gelöscht.
            </p>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
                on:click={handleResetAllProgress}
              >
                Ja, alles löschen
              </button>
              <button
                type="button"
                class="flex-1 py-2 rounded-xl bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                on:click={() => showResetConfirm = false}
              >
                Abbrechen
              </button>
            </div>
          </div>
        {/if}
      </div>

    </div>
  </div>
{/if}

<!-- Toast: Reset Successful -->
{#if resetSuccessToast}
  <div class="fixed bottom-6 right-6 p-4 rounded-2xl bg-emerald-600 text-white text-xs font-bold shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-5 z-50">
    <span class="text-base">✓</span>
    <span>Fortschritt wurde erfolgreich gelöscht!</span>
  </div>
{/if}

<style>
  /* Subtle haptic pulse on success */
  :global(.zoom-in) {
    animation: zoom 0.2s ease-out;
  }
  @keyframes zoom {
    from { transform: translateY(-50%) scale(0.6); opacity: 0; }
    to { transform: translateY(-50%) scale(1); opacity: 1; }
  }
</style>
