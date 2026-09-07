<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { CaseExercise, FSRSCard, UserStats, GrammarCase } from './lib/types';
  import { createNewCard, scheduleCard, partitionQueue } from './lib/fsrs';
  import { loadUserStats, saveUserStats, loadCardsMap, saveCardsMap, clearAllProgress } from './lib/storage';
  import { getDetailedGrammarExplanation } from './lib/grammarExplanation';

  // Settings & modal state
  let showSettingsModal = false;
  let showResetConfirm = false;
  let resetSuccessToast = false;

  // Exercises data
  let allExercises: CaseExercise[] = [];
  let filteredExercises: CaseExercise[] = [];
  let cardsMap: Record<string, FSRSCard> = {};
  let userStats: UserStats = {
    todayCompleted: 0,
    dailyGoal: 25,
    streakDays: 1,
    lastActiveDate: '',
    totalMastered: 0,
    totalReviews: 0,
    correctAnswersCount: 0
  };

  // Session & Queue
  let dueQueue: string[] = [];
  let newQueue: string[] = [];
  let sessionQueue: string[] = [];
  let currentExerciseIndex = 0;
  let currentExercise: CaseExercise | null = null;

  // Active interaction state
  let userInput = '';
  let isCorrect = false;
  let isRevealed = false;
  let showTranslation = false;
  let isAutoAdvancing = false;
  let selectedCaseFilter: GrammarCase | 'all' = 'all';
  let selectedTierFilter: 'all' | 'top1000' | 'top2000' | 'top3000' | 'top4000' = 'all';
  let inputRef: HTMLInputElement | null = null;
  let installPromptEvent: any = null;
  let showInstallButton = false;
  let isLoadingData = true;

  // Visual cues
  let showConfettiCelebration = false;
  let activeTab: 'new' | 'review' = 'new';

  $: currentExercise = sessionQueue.length > 0 && sessionQueue[currentExerciseIndex]
    ? allExercises.find(e => e.id === sessionQueue[currentExerciseIndex]) || null
    : null;

  $: grammarBreakdown = currentExercise ? getDetailedGrammarExplanation(currentExercise) : null;

  $: progressPercent = Math.min(100, Math.round((userStats.todayCompleted / userStats.dailyGoal) * 100));

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

  $: isTargetOnlyTyped = (() => {
    if (!currentExercise || isCorrect || isRevealed) return false;
    const norm = normalizeAnswer(userInput);
    if (!norm) return false;
    const fullNorm = normalizeAnswer(currentExercise.fullSentence);
    if (norm === fullNorm) return false;

    // Check if input matches the targetAnswer
    const targetNorm = normalizeAnswer(currentExercise.targetAnswer);
    if (norm === targetNorm) return true;

    // Or matches one of the accepted target answers
    if (currentExercise.acceptedAnswers?.some(a => {
      const an = normalizeAnswer(a);
      return an === norm && an !== fullNorm;
    })) {
      return true;
    }

    return false;
  })();

  onMount(async () => {
    // 1. Load user progress & cards from storage
    userStats = loadUserStats();
    cardsMap = loadCardsMap();

    // 2. PWA install prompt detection
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      installPromptEvent = e;
      showInstallButton = true;
    });

    // 3. Load generated exercises dataset
    await loadExercisesData();

    // Focus input field immediately
    await tick();
    focusInput();
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

    isLoadingData = false;
    applyFilterAndRebuildQueue();
  }

  function switchTab(tab: 'new' | 'review') {
    activeTab = tab;
    applyFilterAndRebuildQueue();
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

  function applyFilterAndRebuildQueue() {
    let filtered = [...allExercises];
    if (selectedTierFilter !== 'all') {
      filtered = filtered.filter(e => e.category === selectedTierFilter);
    }
    if (selectedCaseFilter !== 'all') {
      filtered = filtered.filter(e => e.case === selectedCaseFilter);
    }
    filteredExercises = filtered;

    const filteredIds = filteredExercises.map(e => e.id);
    const partition = partitionQueue(cardsMap, filteredIds, userStats.dailyGoal, userStats.todayCompleted);
    
    dueQueue = partition.dueQueue;
    newQueue = partition.newQueue;

    if (activeTab === 'review') {
      // TAB 2: Wiederholen -> UNBEGRENZT & GEMISCHT!
      sessionQueue = shuffleQueue(dueQueue);
    } else {
      // TAB 1: Neue Wörter -> 25 Wörter Tagesziel, GEMISCHT!
      const remainingWords = Math.max(1, userStats.dailyGoal - (userStats.todayWordIds?.length || 0));
      const newCardsSlice = Math.max(30, remainingWords * (selectedCaseFilter === 'all' ? 3 : 1) + 10);
      const selectedNewCards = newQueue.slice(0, newCardsSlice);
      sessionQueue = shuffleQueue(selectedNewCards);
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

    if (relevantExercises.length === 0) return;

    // A word is complete if all its exercises are scheduled and none are currently due
    const now = Date.now();
    const allDone = relevantExercises.every(ex => {
      const card = cardsMap[ex.id];
      return card && (card.state === 'mastered' || card.due > now);
    });

    if (allDone) {
      userStats.todayWordIds = [...userStats.todayWordIds, wordId];
      userStats.todayCompleted = userStats.todayWordIds.length;

      if (userStats.todayCompleted === userStats.dailyGoal) {
        showConfettiCelebration = true;
        setTimeout(() => { showConfettiCelebration = false; }, 4000);
      }
    }
  }

  function resetCardState() {
    userInput = '';
    isCorrect = false;
    isRevealed = false;
    showTranslation = false;
    isAutoAdvancing = false;
    tick().then(focusInput);
  }

  function focusInput() {
    if (inputRef) {
      inputRef.focus();
    }
  }

  function handleInput() {
    if (!currentExercise || isCorrect || isRevealed || isAutoAdvancing) return;

    const normalizedInput = normalizeAnswer(userInput);
    if (!normalizedInput) return;

    // 1. Primary check: Full sentence match (case & punctuation insensitive)
    const fullNorm = normalizeAnswer(currentExercise.fullSentence);
    const isFullMatch = normalizedInput === fullNorm;

    // Check variations of full sentence with accepted alternative articles/forms (e.g. "einem" vs "dem", or inverted "solch ein")
    const matchesAcceptedFull = currentExercise.acceptedAnswers.some(a => {
      const candidate = (currentExercise.sentenceStart || '') + a + (currentExercise.sentenceEnd || '');
      return normalizeAnswer(candidate) === normalizedInput;
    });

    // Strictly require typing the full sentence!
    if (isFullMatch || matchesAcceptedFull) {
      markAsCorrect();
    }
  }

  function markAsCorrect() {
    if (!currentExercise || isAutoAdvancing) return;
    isCorrect = true;
    isAutoAdvancing = true;

    // Update FSRS card
    const card = cardsMap[currentExercise.id] || createNewCard(currentExercise.id);
    cardsMap[currentExercise.id] = scheduleCard(card, 'good');
    saveCardsMap(cardsMap);

    // Update user stats
    userStats.totalReviews += 1;
    userStats.correctAnswersCount += 1;
    checkAndRecordWordCompletion(currentExercise.wordId);
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
    saveCardsMap(cardsMap);

    // Re-insert current card at the end of sessionQueue so it's practiced again today
    sessionQueue.push(currentExercise.id);
  }

  function handleMastered() {
    if (!currentExercise) return;

    const card = cardsMap[currentExercise.id] || createNewCard(currentExercise.id);
    cardsMap[currentExercise.id] = scheduleCard(card, 'mastered');
    saveCardsMap(cardsMap);

    userStats.totalMastered += 1;
    checkAndRecordWordCompletion(currentExercise.wordId);
    saveUserStats(userStats);

    advanceToNextCard();
  }

  function advanceToNextCard() {
    if (currentExerciseIndex < sessionQueue.length - 1) {
      currentExerciseIndex += 1;
      resetCardState();
    } else {
      // Re-partition queue
      applyFilterAndRebuildQueue();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    // Space bar when input is empty triggers "Ich weiß das nicht"
    if (e.code === 'Space' && userInput.trim() === '' && !isRevealed && !isCorrect) {
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
  }

  async function handleInstallPwa() {
    if (installPromptEvent) {
      installPromptEvent.prompt();
      const choiceResult = await installPromptEvent.userChoice;
      if (choiceResult.outcome === 'accepted') {
        showInstallButton = false;
      }
      installPromptEvent = null;
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
</svelte:head>

<svelte:window on:keydown={handleKeydown} />

<div class="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 py-6 px-3 sm:px-6 font-sans transition-colors duration-200 flex flex-col justify-between select-none">
  
  <div class="max-w-3xl w-full mx-auto space-y-6">

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

    <!-- Mode Tabs: "Neue Wörter" vs "Wiederholen" (Minimalist, no borders, no emojis) -->
    <nav class="flex items-center justify-center p-1.5 bg-slate-100 dark:bg-slate-800/70 rounded-2xl max-w-xl mx-auto shadow-2xs gap-1">
      <button
        type="button"
        class="flex-1 py-2 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer {activeTab === 'new' 
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
        class="flex-1 py-2 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer {activeTab === 'review' 
          ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs' 
          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}"
        on:click={() => switchTab('review')}
      >
        <span>Wiederholen</span>
        {#if dueQueue.length > 0}
          <span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100/90 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
            {dueQueue.length} fällig
          </span>
        {:else}
          <span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/80 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400">
            0 fällig
          </span>
        {/if}
      </button>
    </nav>

    <!-- Prominent Progress Bar & Daily Motivation Card -->
    <section class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/90 shadow-xs space-y-3">
      {#if activeTab === 'new'}
        <!-- TAB 1: Neue Wörter (25 Wörter Ziel) -->
        <div class="flex items-center justify-between text-xs sm:text-sm gap-2">
          <div class="flex items-center gap-2">
            <span class="font-bold text-slate-800 dark:text-slate-200">Tagesziel</span>
            <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {userStats.todayCompleted} / {userStats.dailyGoal} Wörter
            </span>
          </div>
          <div class="text-xs font-bold {progressPercent >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}">
            {progressPercent}%
          </div>
        </div>

        <!-- Animated Progress Bar for New Words -->
        <div class="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
          <div 
            class="h-full rounded-full transition-all duration-500 ease-out {progressPercent >= 100 ? 'bg-emerald-500' : 'bg-indigo-600 dark:bg-indigo-500'}"
            style="width: {progressPercent}%;"
          ></div>
        </div>
      {:else}
        <!-- TAB 2: Wiederholen (Unbegrenzt) -->
        <div class="flex items-center justify-between text-xs sm:text-sm gap-2">
          <div class="flex items-center gap-2">
            <span class="font-bold text-slate-800 dark:text-slate-200">Wiederholungen</span>
            <span class="px-2 py-0.5 rounded-full text-[11px] font-bold {dueQueue.length === 0 ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'}">
              {dueQueue.length === 0 ? 'Alles erledigt' : `${dueQueue.length} fällig (unbegrenzt)`}
            </span>
          </div>
          <div class="text-xs font-bold {dueQueue.length === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}">
            {dueQueue.length === 0 ? '100%' : `${sessionQueue.length > 0 ? currentExerciseIndex + 1 : 0} / ${sessionQueue.length}`}
          </div>
        </div>

        <!-- Animated Progress Bar for Reviews -->
        <div class="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
          <div 
            class="h-full rounded-full transition-all duration-500 ease-out {dueQueue.length === 0 ? 'bg-emerald-500' : 'bg-amber-500'}"
            style="width: {dueQueue.length === 0 ? 100 : Math.min(100, Math.round(((currentExerciseIndex) / Math.max(1, sessionQueue.length)) * 100))}%;"
          ></div>
        </div>
      {/if}

      <!-- Mini Stats Row (Clean, no harsh borders) -->
      <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 flex-wrap gap-2">
        <div class="flex items-center gap-3">
          <span>Fällig: <strong class="text-amber-600 dark:text-amber-400">{dueQueue.length}</strong></span>
          <span>Neu: <strong class="text-slate-700 dark:text-slate-300">{newQueue.length}</strong></span>
          <span>Gemeistert: <strong class="text-slate-700 dark:text-slate-300">{userStats.totalMastered}</strong></span>
        </div>

        <!-- Filter Selectors -->
        <div class="flex items-center gap-2 flex-wrap">
          <!-- Tier Filter -->
          <div class="flex items-center gap-1">
            <span class="text-[10px] uppercase font-semibold text-slate-400">Stufe:</span>
            <select 
              bind:value={selectedTierFilter} 
              on:change={applyFilterAndRebuildQueue}
              class="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold px-2 py-0.5 rounded cursor-pointer focus:outline-none"
            >
              <option value="all">Alle Stufen</option>
              <option value="top1000">Top 1000</option>
              <option value="top2000">Top 2000</option>
              <option value="top3000">Top 3000</option>
              <option value="top4000">Top 4000</option>
            </select>
          </div>

          <!-- Kasus Filter -->
          <div class="flex items-center gap-1">
            <span class="text-[10px] uppercase font-semibold text-slate-400">Kasus:</span>
            <select 
              bind:value={selectedCaseFilter} 
              on:change={applyFilterAndRebuildQueue}
              class="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold px-2 py-0.5 rounded cursor-pointer focus:outline-none"
            >
              <option value="all">Alle Kasus</option>
              <option value="nominativ">Nominativ</option>
              <option value="akkusativ">Akkusativ</option>
              <option value="dativ">Dativ</option>
            </select>
          </div>
        </div>
      </div>
    </section>

    <!-- Main Practice Card (High Focus & Minimalist) -->
    <main class="relative">
      {#if isLoadingData}
        <div class="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 shadow-xs space-y-3">
          <div class="inline-block animate-spin w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400">Lade Kasus-Übungen...</p>
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
                {userStats.todayCompleted >= userStats.dailyGoal ? 'Tagesziel erreicht' : 'Aktuelle Wörter erledigt'}
              </h2>
              <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {userStats.todayCompleted >= userStats.dailyGoal 
                  ? `Du hast dein Tagesziel von ${userStats.dailyGoal} Wörtern für heute gemeistert.` 
                  : `Du hast heute ${userStats.todayCompleted} von ${userStats.dailyGoal} Wörtern geübt.`}
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

              {#if dueQueue.length > 0}
                <button
                  type="button"
                  class="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-all cursor-pointer active:scale-95"
                  on:click={() => switchTab('review')}
                >
                  {dueQueue.length} Wiederholungen üben ➔
                </button>
              {/if}
            </div>
          </div>
        {/if}

      {:else}
        <!-- Active Exercise Card (Clean, modern elevation, no harsh borders) -->
        <div class="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 shadow-sm space-y-6 relative transition-all duration-200 {isCorrect ? 'ring-2 ring-emerald-500 bg-emerald-50/10' : ''}">
          
          <!-- Top Row of Card: Tier Pill, Case Pill & Hints (Noun + Word/Determiner Pattern) -->
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div class="flex items-center gap-2 flex-wrap">
              <!-- Tier Badge -->
              <span class="px-2 py-0.5 rounded-md text-[11px] font-bold tracking-tight {getTierBadgeStyle(currentExercise.category)}">
                {formatTierName(currentExercise.category)}
              </span>

              <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider {getCaseBadgeStyle(currentExercise.case)}">
                {currentExercise.case}
              </span>
              
              <!-- Hint 1: Pure Noun (learner recalls gender from memory) -->
              <span class="px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-sm sm:text-base font-medium shadow-2xs border border-slate-200/60 dark:border-slate-700/60 flex items-baseline gap-1.5">
                <span class="text-xs sm:text-sm text-slate-400 dark:text-slate-400 font-normal">Nomen:</span>
                <strong class="text-slate-900 dark:text-white font-bold text-base sm:text-lg">{currentExercise.baseNoun}</strong>
              </span>

              <!-- Hint 2: Determiner / Word Pattern -->
              <span class="px-3 py-1.5 rounded-xl bg-indigo-50/90 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-sm sm:text-base font-medium shadow-2xs border border-indigo-200/60 dark:border-indigo-800/60 flex items-baseline gap-1.5">
                <span class="text-xs sm:text-sm text-indigo-400 dark:text-indigo-400 font-normal">Muster:</span>
                <strong class="font-bold text-indigo-900 dark:text-indigo-100">{getDeterminerHint(currentExercise)}</strong>
              </span>
            </div>

            <!-- Optional Translation Toggle -->
            <button
              type="button"
              class="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
              on:click={() => showTranslation = !showTranslation}
              title="Englische Übersetzung einblenden (Tab-Taste)"
            >
              <span>{showTranslation ? 'Übersetzung verbergen' : 'Übersetzung anzeigen'}</span>
              <span class="text-[10px] opacity-60">[{showTranslation ? 'x' : 'Tab'}]</span>
            </button>
          </div>

          <!-- Sentence Prompt with Inline Gap -->
          <div class="space-y-4 py-2">
            <div class="text-xl sm:text-2xl font-bold leading-relaxed text-slate-900 dark:text-white flex flex-wrap items-baseline gap-2 select-text">
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
              {:else}
                <span class="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-lg tracking-wider">
                  ________
                </span>
              {/if}

              {#if currentExercise.sentenceEnd}
                <span>{currentExercise.sentenceEnd}</span>
              {/if}
            </div>

            <!-- Optional English translation if toggled -->
            {#if showTranslation && currentExercise.translation}
              <p class="text-xs sm:text-sm text-slate-400 dark:text-slate-500 italic">
                „{currentExercise.translation}“
              </p>
            {/if}
          </div>

          <!-- Active Text Input Field: For full sentence typing -->
          <div class="space-y-2">
            <div class="relative">
              <input
                bind:this={inputRef}
                type="text"
                bind:value={userInput}
                on:input={handleInput}
                disabled={isCorrect || isRevealed || isAutoAdvancing}
                placeholder="Ganzen Satz hier tippen..."
                class="w-full text-base sm:text-lg px-4 py-3.5 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border-0 transition-all text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs {isCorrect 
                  ? 'ring-2 ring-emerald-500 bg-emerald-50/20 text-emerald-800 dark:text-emerald-200' 
                  : isRevealed 
                  ? 'ring-2 ring-rose-400 bg-rose-50/20 text-rose-800 dark:text-rose-200' 
                  : ''}"
                autocomplete="off"
                autocapitalize="none"
                spellcheck="false"
              />

              {#if isCorrect}
                <span class="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400 text-lg font-black animate-in zoom-in">
                  ✓
                </span>
              {/if}
            </div>

            <!-- Signal if user typed only the missing part instead of the full sentence -->
            {#if isTargetOnlyTyped && currentExercise}
              <div class="p-3 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1 shadow-2xs">
                <span class="text-base sm:text-lg flex-shrink-0">💡</span>
                <div class="leading-snug">
                  <span class="font-bold text-amber-800 dark:text-amber-300">Richtig erkannt!</span>
                  <span class="opacity-90"> Bitte tippe aber den <strong>ganzen Satz</strong> zu Ende:</span>
                  <div class="font-semibold text-slate-800 dark:text-slate-100 mt-1 select-text">
                    „{currentExercise.fullSentence}“
                  </div>
                </div>
              </div>
            {/if}
          </div>

          <!-- Explanation Pill (Shows on reveal or upon correct) -->
          {#if (isRevealed || isCorrect) && grammarBreakdown}
            <div class="p-4 sm:p-5 rounded-2xl text-xs sm:text-sm leading-relaxed space-y-3 animate-in fade-in slide-in-from-top-2 border {isCorrect ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/70 dark:border-emerald-800/40 text-emerald-950 dark:text-emerald-100' : 'bg-slate-50/90 dark:bg-slate-800/70 border-slate-200/80 dark:border-slate-700/60 text-slate-800 dark:text-slate-200'}">
              <div class="flex items-center gap-2 font-bold text-xs uppercase tracking-wider {isCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-indigo-600 dark:text-indigo-400'}">
                <span>📖 Grammatik-Regel & Erklärung</span>
              </div>
              
              <div class="space-y-1.5 border-l-2 pl-3 {isCorrect ? 'border-emerald-400 dark:border-emerald-600' : 'border-indigo-400 dark:border-indigo-500'}">
                <div class="font-semibold text-slate-900 dark:text-white">{grammarBreakdown.genderLine}</div>
                <div class="text-slate-600 dark:text-slate-300">{grammarBreakdown.caseLine}</div>
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

          <!-- Card Bottom Action Bar -->
          <div class="pt-3 flex items-center justify-between gap-2 flex-wrap text-xs">
            
            <!-- Left: "Ich weiß das nicht" button / Hotkey info -->
            <div>
              {#if !isRevealed && !isCorrect}
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium transition-all cursor-pointer active:scale-95"
                  on:click={handleDontKnow}
                  title="Lösung und Regel anzeigen (Leertaste)"
                >
                  <span>Ich weiß das nicht</span>
                  <span class="text-[10px] opacity-50 ml-1">[Leertaste]</span>
                </button>
              {:else if isRevealed}
                <button
                  type="button"
                  class="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                  on:click={advanceToNextCard}
                >
                  <span>Weiter</span>
                  <span>➔</span>
                  <span class="text-[10px] opacity-75">[Enter]</span>
                </button>
              {/if}
            </div>

            <!-- Right: "Kenne ich bereits" button (Mark as Mastered) -->
            <div>
              {#if !isCorrect}
                <button
                  type="button"
                  class="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  on:click={handleMastered}
                  title="Dieses Nomen als dauerhaft gemeistert markieren (Esc-Taste)"
                >
                  <span>Kenne ich bereits</span>
                  <span class="text-[10px] opacity-50">[Esc]</span>
                </button>
              {/if}
            </div>

          </div>

        </div>
      {/if}
    </main>

  </div>

  <!-- Minimal Footer -->
  <footer class="max-w-3xl w-full mx-auto text-center py-4 text-xs text-slate-400 dark:text-slate-500">
    <p>Tippe den ganzen Satz (z. B. <em>Wir betreten gerade den Raum.</em>) — springt bei richtiger Eingabe automatisch weiter.</p>
  </footer>

</div>

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
        <div class="grid grid-cols-5 gap-1.5">
          {#each [10, 15, 20, 25, 30] as goal}
            <button
              type="button"
              class="py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer {userStats.dailyGoal === goal 
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs' 
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700'}"
              on:click={() => {
                userStats.dailyGoal = goal;
                saveUserStats(userStats);
              }}
            >
              {goal}
            </button>
          {/each}
        </div>
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
              <strong>macOS Safari:</strong> Klicke im oberen Menü auf <strong>Ablage</strong> → <strong>„Zum Dock hinzufügen…“</strong>.
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
