<script lang="ts">
  import { onMount } from 'svelte';
  import yaml from 'js-yaml';
  import type { FSRSCard, UserStats, NounGender } from './lib/types';
  import { createNewCard, scheduleCard } from './lib/fsrs';
  import { loadUserStats, saveUserStats, loadCardsMap, saveCardsMap, clearAllProgress, checkAndResetDailyProgress } from './lib/storage';
  import { isPersonOrProfession } from './lib/personNouns';
  import { ALL_CATEGORIES, CATEGORY_GROUPS, CATEGORY_MAP, getCategoryMeta, type CategoryMeta } from './lib/categories';
  import backupWords from './data/reword_backup_words.json';

  // General UI & Tab state
  let showSettingsModal = false;
  let showResetConfirm = false;
  let resetSuccessToast = false;
  let isMinimalMode = false;
  let activeTab: 'training' | 'words' | 'distribution' = 'training';

  interface BackupWordItem {
    wordId: number;
    word: string;
    baseNoun: string;
    article: string;
    gender: NounGender | null | '';
    pos?: 'noun' | 'verb' | 'adjective' | 'adverb' | 'other';
    meaning: string;
    category: string;
    allCategories: string[];
    rewordQueue: number;
    rewordStep: number;
    rewordIntervalDays: number;
    lastReviewTimestamp: number;
    rewordStatus: 'completed' | 'in_review' | 'already_known' | 'new';
    learningFocus: 'genus_only' | 'in_review' | 'already_known' | 'word_and_genus';
    repsRemaining: number;
    examples: Array<{ german: string; english: string }>;
    cases: Array<{ case: string; sentence: string; translation: string }>;
  }

  // Backup data & Custom ChatGPT words
  let allWords: BackupWordItem[] = (backupWords as any) || [];
  let customAddedWords: BackupWordItem[] = [];
  let cardsMap: Record<string, FSRSCard> = {};
  let customFocusMap: Record<number, 'genus_only' | 'in_review' | 'word_and_genus' | 'already_known'> = {};
  let isLoadingData = false;

  // New Word manual creation form state
  let newWordInput = '';
  let newWordMeaning = '';
  let newWordGender: NounGender = 'm';
  let showAddWordSuccess = false;

  // Tab 3 Filter & Search state for all 66 categories
  let pieCategorySearch = '';
  let pieSelectedGroup = 'Alle';
  let pieSortBy: 'active' | 'count' | 'name' = 'active';
  let showOnlyActiveCategories = false;

  let groupWeights: Record<string, number> = {
    'neue-chatgpt-woerter': 30,
    'top1000': 30,
    'top2000': 20,
    'top3000': 10,
    'top4000': 10
  };

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
    excludeAlreadyKnownWords: true,
    inputMode: 'buttons'
  };

  // Filters
  let selectedTierFilter = 'all';

  // Session batch sizes: 5 review + 5 new = 10 words total
  const REVIEW_BATCH_SIZE = 5;
  const NEW_BATCH_SIZE = 5;
  const TOTAL_BATCH_SIZE = 10;

  let copiedToast = false;
  let copiedToastReview = false;
  let copiedToastNew = false;
  let showPromptPreview = false;
  let promptPreviewMode: 'all' | 'review' | 'new' = 'all';
  let showSessionCards = false; // Minimiert standardmäßig

  // YAML Import state
  let yamlInputText = '';
  let isImporting = false;
  let importFeedback: {
    type: 'success' | 'error';
    title: string;
    message: string;
    completedInSession: number;
    todayTotal: number;
    remainingToday: number;
    newWordsCount?: number;
  } | null = null;

  // Words directory state (Tab 2)
  let wordFocusFilter: 'all' | 'chatgpt_only' | 'genus_only' | 'in_review' | 'word_and_genus' | 'already_known' = 'all';
  let wordsSearchQuery = '';
  let wordGenderFilter: 'all' | 'm' | 'f' | 'n' | 'pl' | 'verb' | 'adjective' | 'other' = 'all';
  let wordSortOrder: 'az' | 'za' | 'reps_desc' | 'step_desc' = 'az';
  let wordsPage = 1;
  const WORDS_PER_PAGE = 35;
  let expandedWordId: number | null = null;

  // PWA install support
  let installPromptEvent: any = null;
  let showInstallButton = false;
  let isStandalone = false;

  onMount(() => {
    if (typeof window !== 'undefined') {
      isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      showInstallButton = !isStandalone;
      try {
        isMinimalMode = localStorage.getItem('chatgpt_flashcards_minimal_mode') === 'true';
        
        const savedCustomFocus = localStorage.getItem('river_chatgpt_flashcards_custom_focus');
        if (savedCustomFocus) {
          customFocusMap = JSON.parse(savedCustomFocus);
        }

        const savedCustomWords = localStorage.getItem('river_chatgpt_custom_words');
        if (savedCustomWords) {
          customAddedWords = JSON.parse(savedCustomWords);
        }

        const savedWeights = localStorage.getItem('river_chatgpt_group_distribution');
        if (savedWeights) {
          groupWeights = JSON.parse(savedWeights);
        }
      } catch (e) {}
    }

    userStats = loadUserStats();
    cardsMap = loadCardsMap();
    checkDailyReset();

    const handleVisibilityOrFocus = () => {
      checkDailyReset();
    };
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      installPromptEvent = e;
      showInstallButton = true;
    });

    window.addEventListener('appinstalled', () => {
      showInstallButton = false;
      isStandalone = true;
    });
  });

  function checkDailyReset() {
    const { stats, didReset } = checkAndResetDailyProgress(userStats);
    userStats = stats;
    if (didReset) {
      cardsMap = loadCardsMap();
    }
  }

  // Combined words (Custom ChatGPT words always included at top)
  $: allCombinedWords = [...customAddedWords, ...allWords];

  function parseGenderAndBaseNoun(rawWord: string): { article: string; baseNoun: string; gender: NounGender } {
    const clean = rawWord.trim();
    const match = clean.match(/^(der|die|das)\s+([A-ZÄÖÜa-zäöüß\-]+)/i);
    if (match) {
      const article = match[1].toLowerCase();
      const baseNoun = match[2];
      const gender = article === 'der' ? 'm' : article === 'die' ? 'f' : 'n';
      return { article, baseNoun, gender };
    }
    const parts = clean.split(/[\s(]/);
    return { article: '', baseNoun: parts[0] || clean, gender: 'n' };
  }

  function handleCreateManualWord() {
    if (!newWordInput.trim()) return;
    const { article, baseNoun, gender } = parseGenderAndBaseNoun(newWordInput);
    const resolvedGender = gender || newWordGender;
    const resolvedArticle = article || (resolvedGender === 'm' ? 'der' : resolvedGender === 'f' ? 'die' : 'das');
    const fullWord = newWordInput.startsWith('der ') || newWordInput.startsWith('die ') || newWordInput.startsWith('das ')
      ? newWordInput
      : `${resolvedArticle} ${newWordInput}`;

    const newWordItem: BackupWordItem = {
      wordId: 900000 + customAddedWords.length + Math.floor(Math.random() * 1000),
      word: fullWord,
      baseNoun: baseNoun || newWordInput,
      article: resolvedArticle,
      gender: resolvedGender,
      meaning: newWordMeaning.trim() || '',
      category: 'neue-chatgpt-woerter',
      allCategories: ['neue-chatgpt-woerter'],
      rewordQueue: 0,
      rewordStep: 0,
      rewordIntervalDays: 1,
      lastReviewTimestamp: Date.now(),
      rewordStatus: 'new',
      learningFocus: 'word_and_genus',
      repsRemaining: 10,
      examples: [],
      cases: []
    };

    customAddedWords = [newWordItem, ...customAddedWords];
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('river_chatgpt_custom_words', JSON.stringify(customAddedWords));
    }

    newWordInput = '';
    newWordMeaning = '';
    showAddWordSuccess = true;
    setTimeout(() => {
      showAddWordSuccess = false;
    }, 3000);
  }

  function removeCustomWord(wordId: number) {
    customAddedWords = customAddedWords.filter(w => w.wordId !== wordId);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('river_chatgpt_custom_words', JSON.stringify(customAddedWords));
    }
  }

  function getEffectiveFocus(w: BackupWordItem): 'genus_only' | 'in_review' | 'word_and_genus' | 'already_known' {
    if (customFocusMap[w.wordId]) {
      return customFocusMap[w.wordId];
    }
    return w.learningFocus || 'word_and_genus';
  }

  function cycleLearningFocus(w: BackupWordItem) {
    const current = getEffectiveFocus(w);
    let next: 'genus_only' | 'word_and_genus' | 'in_review' | 'already_known' = 'genus_only';
    if (current === 'genus_only') next = 'in_review';
    else if (current === 'in_review') next = 'word_and_genus';
    else if (current === 'word_and_genus') next = 'already_known';
    else next = 'genus_only';

    customFocusMap[w.wordId] = next;
    customFocusMap = { ...customFocusMap };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('river_chatgpt_flashcards_custom_focus', JSON.stringify(customFocusMap));
    }
  }

  // Filter words by person setting and category tier / group
  $: filteredWords = allCombinedWords.filter(w => {
    if (userStats.skipPeopleAndProfessions && (!w.pos || w.pos === 'noun') && isPersonOrProfession(w.baseNoun)) return false;
    if (selectedTierFilter !== 'all') {
      if (selectedTierFilter === 'neue-chatgpt-woerter') {
        if (w.category !== 'neue-chatgpt-woerter' && (!w.allCategories || !w.allCategories.includes('neue-chatgpt-woerter'))) return false;
      } else {
        if (w.category !== selectedTierFilter && (!w.allCategories || !w.allCategories.includes(selectedTierFilter))) return false;
      }
    }
    return true;
  });

  // Group counts based on effective learning focus
  $: genusOnlyWords = filteredWords.filter(w => getEffectiveFocus(w) === 'genus_only');
  $: inReviewWords = filteredWords.filter(w => getEffectiveFocus(w) === 'in_review');
  $: wordAndGenusWords = filteredWords.filter(w => getEffectiveFocus(w) === 'word_and_genus');
  $: alreadyKnownWords = filteredWords.filter(w => getEffectiveFocus(w) === 'already_known');
  $: chatGptGroupWords = filteredWords.filter(w => w.category === 'neue-chatgpt-woerter' || (w.allCategories && w.allCategories.includes('neue-chatgpt-woerter')));

  $: genusOnlyCount = genusOnlyWords.length;
  $: inReviewCount = inReviewWords.length;
  $: wordAndGenusCount = wordAndGenusWords.length;
  $: alreadyKnownCount = alreadyKnownWords.length;
  $: chatGptWordsCount = chatGptGroupWords.length;
  $: totalWordsCount = filteredWords.length;

  // Exact noun count per category in database
  $: wordCountsByCategory = (() => {
    const counts: Record<string, number> = {};
    for (const cat of ALL_CATEGORIES) {
      counts[cat.id] = 0;
    }
    for (const w of allCombinedWords) {
      const cats = (w.allCategories && w.allCategories.length) ? w.allCategories : [w.category];
      for (const c of cats) {
        if (counts[c] !== undefined) counts[c]++;
        else counts[c] = 1;
      }
    }
    counts['neue-chatgpt-woerter'] = (customAddedWords || []).length;
    return counts;
  })();

  // Filtered categories for the Tab 3 slider list
  $: visibleCategoryDefs = ALL_CATEGORIES.filter(cat => {
    const w = groupWeights[cat.id] || 0;
    if (pieSelectedGroup === 'Aktiv (> 0%)' && w <= 0) return false;
    if (pieSelectedGroup !== 'Alle' && pieSelectedGroup !== 'Aktiv (> 0%)' && cat.group !== pieSelectedGroup) {
      return false;
    }
    if (showOnlyActiveCategories && w <= 0) return false;
    if (pieCategorySearch.trim()) {
      const q = pieCategorySearch.toLowerCase().trim();
      return cat.name.toLowerCase().includes(q) ||
             cat.desc.toLowerCase().includes(q) ||
             cat.group.toLowerCase().includes(q) ||
             cat.id.toLowerCase().includes(q);
    }
    return true;
  }).sort((a, b) => {
    if (pieSortBy === 'active') {
      const wa = (groupWeights[a.id] || 0) > 0 ? 1 : 0;
      const wb = (groupWeights[b.id] || 0) > 0 ? 1 : 0;
      if (wa !== wb) return wb - wa;
      return (wordCountsByCategory[b.id] || 0) - (wordCountsByCategory[a.id] || 0);
    } else if (pieSortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else {
      return (wordCountsByCategory[b.id] || 0) - (wordCountsByCategory[a.id] || 0);
    }
  });

  // 1. Genau 20 Wiederholungswörter (NUR Wörter im aktiven Review-Zyklus aus Spaced Repetition)
  $: sessionReviewWords = (() => {
    const result: BackupWordItem[] = [];
    const todayIds = new Set(userStats.todayWordIds || []);

    // Prio 1: Wörter im aktiven ReWord-Review-Zyklus (in_review), die heute noch nicht geübt wurden
    for (const w of inReviewWords) {
      if (result.length >= REVIEW_BATCH_SIZE) break;
      if (!todayIds.has(w.wordId)) result.push(w);
    }

    // Prio 2: Falls heute schon viele geübt wurden, weitere aus dem inReviewWords-Pool nehmen
    if (result.length < REVIEW_BATCH_SIZE) {
      for (const w of inReviewWords) {
        if (result.length >= REVIEW_BATCH_SIZE) break;
        if (!result.some(r => r.wordId === w.wordId)) {
          result.push(w);
        }
      }
    }

    // NIEMALS als bekannt markierte (already_known) oder als gemeistert markierte (genus_only) Wörter hineinmischen
    return result;
  })();

  // 2. Genau 20 neue Wörter (NUR ECHTE neue Wörter: niemals bereits bekannte oder gemeisterte Wörter!)
  $: sessionNewWords = (() => {
    const result: BackupWordItem[] = [];
    const todayIds = new Set(userStats.todayWordIds || []);
    const reviewIds = new Set(sessionReviewWords.map(w => w.wordId));

    const activeGroups = Object.keys(groupWeights).filter(g => (groupWeights[g] || 0) > 0);
    const totalWeight = activeGroups.reduce((sum, g) => sum + (groupWeights[g] || 0), 0) || 1;

    // Streng filtern: Schließe alle Wörter aus, die bereits bekannt (z. B. Hund, Katze, Fisch),
    // bereits gemeistert (genus_only) oder aktuell in Wiederholung (in_review) sind!
    const eligibleNewWords = filteredWords.filter(w => {
      const focus = getEffectiveFocus(w);
      if (focus === 'already_known') return false; // Bereits bekannt in ReWord
      if (focus === 'genus_only') return false;   // Bereits gemeistert in ReWord
      if (focus === 'in_review') return false;    // Im Wiederholungszyklus
      return true;
    });

    const wordsByGroup: Record<string, BackupWordItem[]> = {};
    for (const g of activeGroups) {
      wordsByGroup[g] = [];
    }

    for (const w of eligibleNewWords) {
      if (todayIds.has(w.wordId) || reviewIds.has(w.wordId)) continue;

      for (const g of activeGroups) {
        if (g === 'neue-chatgpt-woerter') {
          if (w.category === 'neue-chatgpt-woerter' || (w.allCategories && w.allCategories.includes('neue-chatgpt-woerter'))) {
            wordsByGroup[g].push(w);
          }
        } else {
          if (w.category === g || (w.allCategories && w.allCategories.includes(g))) {
            wordsByGroup[g].push(w);
          }
        }
      }
    }

    for (const g of activeGroups) {
      if (result.length >= NEW_BATCH_SIZE) break;
      const target = Math.max(1, Math.round((NEW_BATCH_SIZE * (groupWeights[g] || 0)) / totalWeight));
      const pool = wordsByGroup[g] || [];
      for (let i = 0; i < target && i < pool.length; i++) {
        if (result.length >= NEW_BATCH_SIZE) break;
        if (!result.some(r => r.wordId === pool[i].wordId)) {
          result.push(pool[i]);
        }
      }
    }

    // Fallback: NUR aus eligibleNewWords (echte neue Vokabeln!)
    if (result.length < NEW_BATCH_SIZE) {
      for (const w of eligibleNewWords) {
        if (result.length >= NEW_BATCH_SIZE) break;
        if (!reviewIds.has(w.wordId) && !result.some(r => r.wordId === w.wordId)) {
          result.push(w);
        }
      }
    }

    return result;
  })();

  // Kombinierte Liste von exakt 10 Wörtern (5 Wiederholung + 5 Neu)
  $: sessionWords = [...sessionReviewWords, ...sessionNewWords];

  $: sessionWordChunks = (() => {
    const chunks: BackupWordItem[][] = [];
    const list = [...sessionWords];
    if (list.length === 10) {
      chunks.push(list.slice(0, 3));
      chunks.push(list.slice(3, 6));
      chunks.push(list.slice(6, 8));
      chunks.push(list.slice(8, 10));
    } else {
      for (let i = 0; i < list.length; i += 3) {
        chunks.push(list.slice(i, i + 3));
      }
    }
    return chunks;
  })();

  // Progress computations
  $: wordsPercent = Math.min(100, Math.round((userStats.todayCompleted / Math.max(1, userStats.dailyGoal)) * 100));
  $: remainingToday = Math.max(0, userStats.dailyGoal - userStats.todayCompleted);

  // Active categories list and total weights
  $: activeCategoriesList = ALL_CATEGORIES.filter(c => (groupWeights[c.id] || 0) > 0);
  $: totalWeightsSum = activeCategoriesList.reduce((sum, c) => sum + (groupWeights[c.id] || 0), 0);

  // Pie Chart computation: computes reactive slices from groupWeights for all active categories
  $: pieSlices = (() => {
    if (totalWeightsSum <= 0) return [];
    let accumulatedPercent = 0;

    return activeCategoriesList.map(def => {
      const weight = groupWeights[def.id] || 0;
      const percent = Math.round((weight / totalWeightsSum) * 100);
      const startPercent = accumulatedPercent;
      accumulatedPercent += (weight / totalWeightsSum) * 100;
      const endPercent = accumulatedPercent;

      // Calculate SVG arc path
      const startAngle = (startPercent / 100) * 2 * Math.PI - Math.PI / 2;
      const endAngle = (endPercent / 100) * 2 * Math.PI - Math.PI / 2;

      const x1 = 100 + 80 * Math.cos(startAngle);
      const y1 = 100 + 80 * Math.sin(startAngle);
      const x2 = 100 + 80 * Math.cos(endAngle);
      const y2 = 100 + 80 * Math.sin(endAngle);
      const largeArc = (endAngle - startAngle > Math.PI) ? 1 : 0;

      let pathD = '';
      if (percent >= 99 || activeCategoriesList.length === 1) {
        pathD = 'FULL';
      } else if (weight > 0) {
        pathD = `M 100 100 L ${x1.toFixed(2)} ${y1.toFixed(2)} A 80 80 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
      }

      return {
        ...def,
        weight,
        percent,
        pathD,
        count: wordCountsByCategory[def.id] || 0
      };
    });
  })();

  function updateWeight(groupId: string, val: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(val)));
    if (clamped === 0) {
      delete groupWeights[groupId];
    } else {
      groupWeights[groupId] = clamped;
    }
    groupWeights = { ...groupWeights };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('river_chatgpt_group_distribution', JSON.stringify(groupWeights));
    }
  }

  function setPreset(preset: 'chatgpt' | 'top1000' | 'medical' | 'nature' | 'tiers' | 'reset') {
    const newWeights: Record<string, number> = {};
    if (preset === 'chatgpt') {
      newWeights['neue-chatgpt-woerter'] = 100;
    } else if (preset === 'top1000') {
      newWeights['top1000'] = 70;
      newWeights['neue-chatgpt-woerter'] = 30;
    } else if (preset === 'medical') {
      newWeights['medical_anatomy_advanced'] = 25;
      newWeights['medical_diseases_symptoms'] = 25;
      newWeights['medical_hospital'] = 25;
      newWeights['neue-chatgpt-woerter'] = 25;
    } else if (preset === 'nature') {
      newWeights['plants'] = 25;
      newWeights['animals_birds'] = 25;
      newWeights['gardening'] = 25;
      newWeights['weather'] = 25;
    } else if (preset === 'tiers') {
      newWeights['top1000'] = 30;
      newWeights['top2000'] = 25;
      newWeights['top3000'] = 20;
      newWeights['top4000'] = 15;
      newWeights['neue-chatgpt-woerter'] = 10;
    } else if (preset === 'reset') {
      // empty
    }
    groupWeights = newWeights;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('river_chatgpt_group_distribution', JSON.stringify(groupWeights));
    }
  }

  function setVisibleCategoriesWeight(val: number) {
    for (const cat of visibleCategoryDefs) {
      if (val === 0) {
        delete groupWeights[cat.id];
      } else {
        groupWeights[cat.id] = val;
      }
    }
    groupWeights = { ...groupWeights };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('river_chatgpt_group_distribution', JSON.stringify(groupWeights));
    }
  }

  // Helper to format words compactly inside the ChatGPT prompt
  function formatWordForPrompt(w: BackupWordItem, idx: number): string {
    const focus = getEffectiveFocus(w);
    const isVerb = w.pos === 'verb';
    const isAdj = w.pos === 'adjective';
    const isNoun = !w.pos || w.pos === 'noun';

    let tag = '';
    if (w.category === 'neue-chatgpt-woerter') tag = 'ChatGPT-Wort';
    else if (focus === 'genus_only') tag = 'Nur Genus';
    else if (focus === 'in_review') tag = `Wiederholung (Stufe ${w.rewordStep})`;
    else if (focus === 'already_known') tag = 'Bekannt';
    else tag = isNoun ? 'Neu (Wort & Genus)' : isVerb ? 'Neu (Verb)' : isAdj ? 'Neu (Adjektiv)' : 'Neu';

    let gram = '';
    if (isNoun && w.gender) {
      gram = `(${w.gender === 'm' ? 'der' : w.gender === 'f' ? 'die' : w.gender === 'n' ? 'das' : 'Plural'})`;
    } else if (isVerb) {
      gram = '(Verb)';
    } else if (isAdj) {
      gram = '(Adj)';
    }

    let bsp = '';
    if (w.cases && w.cases.length > 0) {
      bsp = ` | Bsp: "${w.cases[0].sentence}"`;
    } else if (w.examples && w.examples.length > 0) {
      bsp = ` | Bsp: "${w.examples[0].german}"`;
    }

    return `${idx + 1}. [ID:${w.wordId}] ${w.word} ${gram} = "${w.meaning}" [${tag}]${bsp}`;
  }

  // 1. Gesamter Prompt (10 Wörter: 5 Wiederholungen + 5 neue Wörter)
  $: chatGptPrompt = (() => {
    if (sessionWords.length === 0) {
      return 'Aktuell sind keine Wörter für diese Session verfügbar. Passe deine Filter oder das Tagesziel in den Einstellungen an.';
    }

    const reviewFormatted = sessionReviewWords.map((w, idx) => formatWordForPrompt(w, idx)).join('\n');
    const newFormatted = sessionNewWords.map((w, idx) => formatWordForPrompt(w, sessionReviewWords.length + idx)).join('\n');

    return `Du bist mein Deutsch-Trainer im ChatGPT Voice Mode.
Heute üben wir genau 10 Wörter:
- 5 WIEDERHOLUNGEN (schnell prüfen: Bedeutung & Artikel/Konjugation, sofort abhaken)
- 5 NEUE WÖRTER (in 1-2er Schritten kurz erklären, Beispielsatz bilden, mich sprechen lassen)

Wichtige Regeln für den Voice Mode:
1. Fasse dich extrem kurz! Antworte immer nur in 1-2 kurzen, natürlichen Sätzen.
2. Beginne direkt mit den 5 Wiederholungen. Frage zügig: "Kennst du das Wort? Welcher Artikel/welche Bedeutung gehört dazu?"
3. Danach die 5 neuen Wörter: Immer nur 1-2 Wörter auf einmal, kurz erklären und mich einen Satz sprechen lassen.
4. Neue Wörter, die im Gespräch entstehen, notierst du am Ende unter "new_words_added".
5. Am Ende (oder wenn ich "fertig" sage) gibst du mir die schriftliche YAML-Zusammenfassung:
\`\`\`yaml
session_summary:
  words_practiced:
    - word_id: ${sessionWords[0]?.wordId || 470}
      word: "${sessionWords[0]?.word || 'der Raum'}"
      rating: "good" # "good" (gewusst), "again" (wiederholen), "mastered" (perfekt)
  new_words_added:
    - word: "die Abkürzung"
      meaning: "shortcut"
      rating: "good"
\`\`\`

---
### 5 Wiederholungswörter:
${reviewFormatted}

---
### 5 Neue Wörter:
${newFormatted}
`;
  })();

  // 2. Prompt nur für die 5 Wiederholungswörter
  $: chatGptReviewPrompt = (() => {
    if (sessionReviewWords.length === 0) return 'Keine Wiederholungswörter verfügbar.';
    const formatted = sessionReviewWords.map((w, idx) => formatWordForPrompt(w, idx)).join('\n');

    return `Du bist mein Deutsch-Trainer im ChatGPT Voice Mode.
Fokus: Schnelle Wiederholung von 5 Wörtern.

Regeln:
1. Frage die 5 Wörter nacheinander kurz ab: "Welcher Artikel und welche Bedeutung gehört dazu?"
2. Sobald ich antworte, kurz bestätigen und sofort zum nächsten Wort.
3. Am Ende schriftlich diese YAML-Zusammenfassung ausgeben:
\`\`\`yaml
session_summary:
  words_practiced:
    - word_id: ${sessionReviewWords[0]?.wordId || 470}
      word: "${sessionReviewWords[0]?.word || 'der Raum'}"
      rating: "good"
\`\`\`

---
### 5 Wiederholungswörter:
${formatted}
`;
  })();

  // 3. Prompt nur für die 5 neuen Wörter
  $: chatGptNewPrompt = (() => {
    if (sessionNewWords.length === 0) return 'Keine neuen Wörter verfügbar.';
    const formatted = sessionNewWords.map((w, idx) => formatWordForPrompt(w, idx)).join('\n');

    return `Du bist mein Deutsch-Trainer im ChatGPT Voice Mode.
Fokus: 5 NEUE Wörter lernen.

Regeln:
1. Gehe die Wörter in 1-2er Schritten durch. Erkläre kurz Bedeutung und Artikel/Konjugation, bilde einen Beispielsatz und lass mich sprechen.
2. Wenn neue Wörter entstehen, notiere sie unter "new_words_added".
3. Am Ende schriftlich diese YAML-Zusammenfassung ausgeben:
\`\`\`yaml
session_summary:
  words_practiced:
    - word_id: ${sessionNewWords[0]?.wordId || 470}
      word: "${sessionNewWords[0]?.word || 'der Raum'}"
      rating: "good"
  new_words_added:
    - word: "die Abkürzung"
      meaning: "shortcut"
      rating: "good"
\`\`\`

---
### 5 Neue Wörter:
${formatted}
`;
  })();

  async function copyPrompt(type: 'all' | 'review' | 'new' = 'all') {
    let text = chatGptPrompt;
    if (type === 'review') text = chatGptReviewPrompt;
    else if (type === 'new') text = chatGptNewPrompt;

    try {
      await navigator.clipboard.writeText(text);
      if (type === 'all') {
        copiedToast = true;
        setTimeout(() => copiedToast = false, 3500);
      } else if (type === 'review') {
        copiedToastReview = true;
        setTimeout(() => copiedToastReview = false, 3500);
      } else if (type === 'new') {
        copiedToastNew = true;
        setTimeout(() => copiedToastNew = false, 3500);
      }
    } catch (e) {
      console.warn('Clipboard API Fallback:', e);
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      if (type === 'all') {
        copiedToast = true;
        setTimeout(() => copiedToast = false, 3500);
      } else if (type === 'review') {
        copiedToastReview = true;
        setTimeout(() => copiedToastReview = false, 3500);
      } else if (type === 'new') {
        copiedToastNew = true;
        setTimeout(() => copiedToastNew = false, 3500);
      }
    }
  }

  function handleImportYaml() {
    if (!yamlInputText.trim()) {
      importFeedback = {
        type: 'error',
        title: 'Kein Inhalt',
        message: 'Bitte füge zuerst die YAML-Antwort von ChatGPT in das Textfeld ein.',
        completedInSession: 0,
        todayTotal: userStats.todayCompleted,
        remainingToday
      };
      return;
    }

    isImporting = true;
    try {
      const codeFenceMatch = yamlInputText.match(/```(?:ya?ml)?\s*([\s\S]*?)```/i);
      const cleanYaml = codeFenceMatch ? codeFenceMatch[1] : yamlInputText;
      const parsed: any = yaml.load(cleanYaml);

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Ungültiges YAML-Format.');
      }

      // 1. Process practiced words
      let list: any[] = [];
      if (Array.isArray(parsed.session_summary?.words_practiced)) {
        list = parsed.session_summary.words_practiced;
      } else if (Array.isArray(parsed.words_practiced)) {
        list = parsed.words_practiced;
      } else if (Array.isArray(parsed.words)) {
        list = parsed.words;
      } else if (Array.isArray(parsed)) {
        list = parsed;
      }

      let updatedCount = 0;
      let masteredCount = 0;
      let againCount = 0;
      let goodCount = 0;

      for (const item of list) {
        const wordId = Number(item.word_id || item.id);
        const wordStr = String(item.word || item.name || '').trim();

        const match = allCombinedWords.find(w => {
          if (!isNaN(wordId) && wordId > 0) return w.wordId === wordId;
          if (wordStr) {
            return w.baseNoun.toLowerCase() === wordStr.toLowerCase() ||
                   w.word.toLowerCase().includes(wordStr.toLowerCase());
          }
          return false;
        });

        if (!match) continue;

        const rawRating = String(item.rating || 'good').toLowerCase();
        let rating: 'again' | 'good' | 'mastered' = 'good';
        if (rawRating.includes('again') || rawRating.includes('repeat') || rawRating.includes('hard') || rawRating.includes('schwer')) {
          rating = 'again';
          againCount++;
        } else if (rawRating.includes('master') || rawRating.includes('perfect') || rawRating.includes('easy')) {
          rating = 'mastered';
          masteredCount++;
        } else {
          rating = 'good';
          goodCount++;
        }

        const cardKey = `word_${match.wordId}`;
        const card = cardsMap[cardKey] || createNewCard(cardKey);
        cardsMap[cardKey] = scheduleCard(card, rating);

        updatedCount++;

        if (!userStats.todayWordIds) userStats.todayWordIds = [];
        if (!userStats.todayWordIds.includes(match.wordId)) {
          userStats.todayWordIds.push(match.wordId);
          userStats.todayCompleted += 1;
        }

        userStats.totalReviews += 1;
        if (rating === 'mastered') {
          userStats.totalMastered += 1;
        }
      }

      // 2. Process NEW WORDS added from ChatGPT (group: neue-chatgpt-woerter)
      let addedFromGptCount = 0;
      const rawNewWords = parsed.session_summary?.new_words_added || parsed.new_words_added || [];
      if (Array.isArray(rawNewWords) && rawNewWords.length > 0) {
        for (const nw of rawNewWords) {
          const rawWordStr = String(nw.word || nw.name || '').trim();
          if (!rawWordStr) continue;

          // Check if already exists
          if (allCombinedWords.some(w => w.word.toLowerCase() === rawWordStr.toLowerCase())) continue;

          const { article, baseNoun, gender } = parseGenderAndBaseNoun(rawWordStr);
          const resolvedGender = (nw.gender || gender || 'n') as NounGender;
          const resolvedArticle = article || (resolvedGender === 'm' ? 'der' : resolvedGender === 'f' ? 'die' : 'das');
          const fullWord = rawWordStr.startsWith('der ') || rawWordStr.startsWith('die ') || rawWordStr.startsWith('das ')
            ? rawWordStr
            : `${resolvedArticle} ${rawWordStr}`;

          const newItem: BackupWordItem = {
            wordId: 800000 + customAddedWords.length + Math.floor(Math.random() * 1000),
            word: fullWord,
            baseNoun: baseNoun || rawWordStr,
            article: resolvedArticle,
            gender: resolvedGender,
            meaning: nw.meaning || '',
            category: 'neue-chatgpt-woerter',
            allCategories: ['neue-chatgpt-woerter'],
            rewordQueue: 0,
            rewordStep: 0,
            rewordIntervalDays: 1,
            lastReviewTimestamp: Date.now(),
            rewordStatus: 'new',
            learningFocus: 'word_and_genus',
            repsRemaining: 10,
            examples: nw.example ? [{ german: nw.example, english: '' }] : [],
            cases: []
          };

          customAddedWords = [newItem, ...customAddedWords];
          addedFromGptCount++;
        }

        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('river_chatgpt_custom_words', JSON.stringify(customAddedWords));
        }
      }

      userStats.todaySentencesCompleted = (userStats.todaySentencesCompleted || 0) + (updatedCount * 3);
      saveCardsMap(cardsMap);
      saveUserStats(userStats);

      cardsMap = { ...cardsMap };
      userStats = { ...userStats };

      const newRemaining = Math.max(0, userStats.dailyGoal - userStats.todayCompleted);

      importFeedback = {
        type: 'success',
        title: 'Erfolgreich importiert!',
        message: `${updatedCount} Wörter wurden ausgewertet (${goodCount} gut, ${masteredCount} gemeistert, ${againCount} Wiederholung vorgemerkt).` +
                 (addedFromGptCount > 0 ? ` 🚀 ${addedFromGptCount} neue Wörter automatisch zur Gruppe 'neue-chatgpt-woerter' hinzugefügt!` : ''),
        completedInSession: updatedCount,
        todayTotal: userStats.todayCompleted,
        remainingToday: newRemaining,
        newWordsCount: addedFromGptCount
      };

      yamlInputText = '';
    } catch (err: any) {
      console.error('YAML Import Error:', err);
      importFeedback = {
        type: 'error',
        title: 'Import-Fehler',
        message: err.message || 'Das YAML-Dokument konnte nicht verarbeitet werden.',
        completedInSession: 0,
        todayTotal: userStats.todayCompleted,
        remainingToday
      };
    } finally {
      isImporting = false;
    }
  }

  function loadSampleYaml() {
    if (sessionWords.length === 0) return;
    const sampleItems = sessionWords.slice(0, 3).map((w, i) => `    - word_id: ${w.wordId}
      word: "${w.word}"
      rating: "${i === 0 ? 'good' : i === 1 ? 'mastered' : 'again'}"
      notes: "Genus und Kasus erfolgreich geübt"`).join('\n');

    yamlInputText = `session_summary:
  words_practiced:
${sampleItems}
  new_words_added:
    - word: "die Abkürzung (die Abkürzungen)"
      meaning: "shortcut, abbreviation"
      rating: "good"`;
  }

  function toggleMinimalMode() {
    isMinimalMode = !isMinimalMode;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('chatgpt_flashcards_minimal_mode', String(isMinimalMode));
      } catch (e) {}
    }
  }

  function handleResetAllData() {
    clearAllProgress();
    cardsMap = {};
    customFocusMap = {};
    customAddedWords = [];
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('river_chatgpt_flashcards_custom_focus');
      localStorage.removeItem('river_chatgpt_custom_words');
    }
    userStats = loadUserStats();
    showResetConfirm = false;
    resetSuccessToast = true;
    setTimeout(() => {
      resetSuccessToast = false;
    }, 3000);
  }

  function handleInstallPwa() {
    if (installPromptEvent) {
      installPromptEvent.prompt();
      installPromptEvent.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          showInstallButton = false;
        }
        installPromptEvent = null;
      });
    }
  }

  // Filter and sort for Tab 2: Wörter-Verzeichnis
  $: filteredWordsList = (() => {
    let list = filteredWords;

    if (wordsSearchQuery.trim()) {
      const q = wordsSearchQuery.toLowerCase().trim();
      list = list.filter(w =>
        w.baseNoun.toLowerCase().includes(q) ||
        w.word.toLowerCase().includes(q) ||
        w.meaning.toLowerCase().includes(q)
      );
    }

    if (wordGenderFilter !== 'all') {
      if (wordGenderFilter === 'verb') {
        list = list.filter(w => w.pos === 'verb');
      } else if (wordGenderFilter === 'adjective') {
        list = list.filter(w => w.pos === 'adjective');
      } else if (wordGenderFilter === 'other') {
        list = list.filter(w => w.pos === 'adverb' || w.pos === 'other');
      } else {
        list = list.filter(w => w.gender === wordGenderFilter);
      }
    }

    if (wordFocusFilter === 'chatgpt_only') {
      list = list.filter(w => w.category === 'neue-chatgpt-woerter');
    } else if (wordFocusFilter === 'genus_only') {
      list = list.filter(w => getEffectiveFocus(w) === 'genus_only');
    } else if (wordFocusFilter === 'in_review') {
      list = list.filter(w => getEffectiveFocus(w) === 'in_review');
    } else if (wordFocusFilter === 'word_and_genus') {
      list = list.filter(w => getEffectiveFocus(w) === 'word_and_genus');
    } else if (wordFocusFilter === 'already_known') {
      list = list.filter(w => getEffectiveFocus(w) === 'already_known');
    }

    return list.sort((a, b) => {
      if (wordSortOrder === 'az') return a.baseNoun.localeCompare(b.baseNoun, 'de');
      if (wordSortOrder === 'za') return b.baseNoun.localeCompare(a.baseNoun, 'de');
      if (wordSortOrder === 'step_desc') return b.rewordStep - a.rewordStep;
      if (wordSortOrder === 'reps_desc') return a.repsRemaining - b.repsRemaining;
      return a.category.localeCompare(b.category);
    });
  })();

  $: paginatedWordsList = filteredWordsList.slice(0, wordsPage * WORDS_PER_PAGE);
  $: hasMoreWords = paginatedWordsList.length < filteredWordsList.length;

  function getGenderBadge(gender: NounGender | null | string, pos?: string) {
    if (pos === 'verb') return { label: 'Verb', color: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
    if (pos === 'adjective') return { label: 'Adjektiv', color: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
    if (pos === 'adverb') return { label: 'Adverb', color: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800' };
    if (pos === 'other') return { label: 'Wort', color: 'bg-slate-50 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800' };
    if (gender === 'm') return { label: 'der (Maskulin)', color: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' };
    if (gender === 'f') return { label: 'die (Feminin)', color: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' };
    if (gender === 'n') return { label: 'das (Neutrum)', color: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' };
    if (gender === 'pl') return { label: 'die (Plural)', color: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
    return { label: 'Wort', color: 'bg-slate-50 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800' };
  }

  function getFocusBadge(focus: string, repsRemaining: number, step: number, category: string) {
    if (category === 'neue-chatgpt-woerter') {
      return {
        label: '✨ ChatGPT-Wort',
        desc: 'In einer ChatGPT-Session hinzugefügt',
        color: 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700'
      };
    }
    if (focus === 'genus_only') {
      return {
        label: '🎯 Nur Genus lernen',
        desc: 'In ReWord fertig – lerne nur das Geschlecht',
        color: 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700'
      };
    }
    if (focus === 'in_review') {
      return {
        label: `🔄 Wiederholen (Stufe ${step}) • noch ${repsRemaining}x`,
        desc: `Noch ${repsRemaining} Wiederholungen bis gemeistert`,
        color: 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
      };
    }
    if (focus === 'already_known') {
      return {
        label: '✓ In ReWord bekannt',
        desc: 'Wurde in ReWord als bekannt übersprungen',
        color: 'bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-700'
      };
    }
    return {
      label: '✨ Wort & Genus lernen',
      desc: 'Neues Wort – Bedeutung & Genus von Grund auf',
      color: 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700'
    };
  }
</script>

<svelte:head>
  <title>ChatGPT + Flashcards Trainer | river.berlin</title>
  <meta name="description" content="Interaktiver Deutsch-Trainer mit ReWord-Synchronisierung, modifizierbarem Pie-Chart und ChatGPT-Wortgruppen." />
  <meta name="theme-color" content="#6366f1" />
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
  <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
  <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="ChatGPT + Flashcards Trainer" />
  <meta name="application-name" content="ChatGPT + Flashcards Trainer" />
</svelte:head>

<div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pt-2 pb-10 px-3 sm:pt-6 sm:px-6 font-sans transition-colors duration-200 flex flex-col justify-between select-none">
  
  <div class="max-w-3xl w-full mx-auto space-y-3 sm:space-y-5">

    <!-- Top Header -->
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
        <h1 class="text-sm sm:text-base font-bold tracking-tight text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <span class="text-indigo-600 dark:text-indigo-400">⚡</span>
          <span>ChatGPT + Flashcards Trainer</span>
        </h1>
      </div>

      <!-- Header actions: Install button, Streak, Settings -->
      <div class="flex items-center gap-2">
        {#if showInstallButton}
          <button
            type="button"
            class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
            on:click={handleInstallPwa}
          >
            App installieren
          </button>
        {/if}

        <!-- Streak Badge -->
        <div class="inline-flex items-center px-3 py-1 rounded-full bg-amber-100/70 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 text-xs font-semibold">
          <span>🔥 {userStats.streakDays} {userStats.streakDays === 1 ? 'Tag' : 'Tage'} Streak</span>
        </div>

        <!-- Settings Button -->
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

    <!-- Navigation Tabs (3 Tabs) -->
    <nav class="flex items-center justify-center p-1 bg-slate-200/70 dark:bg-slate-900 rounded-xl max-w-xl mx-auto shadow-xs gap-1 border border-slate-200 dark:border-slate-800">
      <button
        type="button"
        class="flex-1 py-2 px-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer {activeTab === 'training' 
          ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}"
        on:click={() => activeTab = 'training'}
      >
        <span>🎙️ Training</span>
        <span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold {activeTab === 'training' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300' : 'bg-slate-300/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300'}">
          {userStats.todayCompleted} / {userStats.dailyGoal}
        </span>
      </button>

      <button
        type="button"
        class="flex-1 py-2 px-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer {activeTab === 'words' 
          ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm' 
          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}"
        on:click={() => activeTab = 'words'}
      >
        <span>📖 Wörter ({totalWordsCount})</span>
      </button>

      <button
        type="button"
        class="flex-1 py-2 px-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer {activeTab === 'distribution' 
          ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm' 
          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}"
        on:click={() => activeTab = 'distribution'}
      >
        <span>🥧 Verteilung (Pie)</span>
      </button>
    </nav>

    <!-- Daily Goal & ReWord Stats Banner -->
    <section class="{isMinimalMode ? 'p-2.5' : 'p-4 sm:p-5'} rounded-2xl bg-white dark:bg-slate-900 shadow-xs border border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
      {#if isMinimalMode}
        <div class="flex items-center gap-3 w-full">
          <div class="flex-1 space-y-1">
            <div class="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
              <div 
                class="h-full rounded-full transition-all duration-500 {wordsPercent >= 100 ? 'bg-emerald-500' : 'bg-indigo-600 dark:bg-indigo-500'}"
                style="width: {wordsPercent}%;"
              ></div>
            </div>
          </div>
          <button
            type="button"
            class="shrink-0 px-2 py-0.5 rounded text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 cursor-pointer"
            on:click={toggleMinimalMode}
          >
            Details einblenden
          </button>
        </div>
      {:else}
        <div class="space-y-2">
          <div class="flex items-center justify-between text-xs">
            <div class="flex items-center gap-2">
              <span class="font-bold text-slate-800 dark:text-slate-200">Tagesziel (Wörter)</span>
              <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                {userStats.todayCompleted} / {userStats.dailyGoal}
              </span>
              {#if remainingToday > 0}
                <span class="text-slate-500 dark:text-slate-400 text-[11px]">
                  (noch {remainingToday} Wörter)
                </span>
              {:else}
                <span class="text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                  Ziel erreicht! 🎉
                </span>
              {/if}
            </div>

            <div class="flex items-center gap-3">
              <span class="font-bold {wordsPercent >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}">
                {wordsPercent}%
              </span>
              <button
                type="button"
                class="text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                on:click={toggleMinimalMode}
              >
                Minimal
              </button>
            </div>
          </div>

          <!-- Progress bar -->
          <div class="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative shadow-inner">
            <div 
              class="h-full rounded-full transition-all duration-500 {wordsPercent >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-purple-600'}"
              style="width: {wordsPercent}%;"
            ></div>
          </div>

          <div class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5 flex-wrap gap-2">
            <div>
              <span>✨ ChatGPT: <strong class="text-purple-600 dark:text-purple-400">{chatGptWordsCount}</strong></span>
              <span class="mx-1.5">•</span>
              <span>🎯 Nur Genus: <strong class="text-purple-600 dark:text-purple-400">{genusOnlyCount}</strong></span>
              <span class="mx-1.5">•</span>
              <span>🔄 In Wiederholung: <strong class="text-amber-600 dark:text-amber-400">{inReviewCount}</strong></span>
            </div>
            <div>
              <span>Gesamtdatenbank: <strong>{totalWordsCount} Nomen</strong></span>
            </div>
          </div>
        </div>
      {/if}
    </section>

    <!-- Main Content Area -->
    <main>
      {#if isLoadingData}
        <div class="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 shadow-xs space-y-3 border border-slate-200/70 dark:border-slate-800/70">
          <div class="inline-block animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400">Lade Wörter...</p>
        </div>

      {:else if activeTab === 'training'}
        <!-- Tab 1: ChatGPT Training Session -->
        <div class="space-y-4 animate-in fade-in duration-200">
          
          <!-- Streamlined Action Card: Nur ein einziger Button -->
          <div class="p-5 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/80 dark:border-slate-800/80 space-y-4">
            
            <div class="space-y-1">
              <h2 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Sprachtraining mit ChatGPT</span>
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Wörterverteilung wird dynamisch nach deinen <strong>Pie-Chart Einstellungen</strong> zusammengestellt. Neue Wörter werden der Gruppe <strong>'neue-chatgpt-woerter'</strong> hinzugefügt.
              </p>
            </div>

            <!-- Action Buttons: 10 Wörter gesamt + zwei dedizierte Knöpfe darunter -->
            <div class="space-y-2.5">
              <!-- Big Hero Button: All 10 words (5 neu + 5 Wiederholung) -->
              <button
                type="button"
                class="w-full py-3.5 sm:py-4 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-sm sm:text-base shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer relative overflow-hidden group"
                on:click={() => copyPrompt('all')}
              >
                {#if copiedToast}
                  <span class="animate-bounce text-lg">✓</span>
                  <span>10 Wörter kopiert! (5 neu + 5 Wiederholung)</span>
                {:else}
                  <svg class="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  <span>Gesamten Prompt kopieren ({sessionWords.length} Wörter: {sessionNewWords.length} neu + {sessionReviewWords.length} Wiederholung)</span>
                {/if}
              </button>

              <!-- Two Split Buttons Underneath: Nur Wiederholung / Nur Neue Wörter -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <!-- Knopf 1: Nur Wiederholung (5) -->
                <button
                  type="button"
                  class="py-3 px-4 rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold text-xs sm:text-sm shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  on:click={() => copyPrompt('review')}
                  title="Kopiert nur die Wiederholungswörter als ChatGPT Voice-Prompt"
                >
                  {#if copiedToastReview}
                    <span class="font-extrabold text-amber-600 dark:text-amber-400">✓</span>
                    <span>Wiederholungen kopiert!</span>
                  {:else}
                    <span class="text-base">🔄</span>
                    <span>Nur Wiederholungen kopieren ({sessionReviewWords.length} Wörter)</span>
                  {/if}
                </button>

                <!-- Knopf 2: Nur neue Wörter (5) -->
                <button
                  type="button"
                  class="py-3 px-4 rounded-xl border border-purple-300 dark:border-purple-700/80 bg-purple-50 hover:bg-purple-100/80 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-900 dark:text-purple-200 font-bold text-xs sm:text-sm shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  on:click={() => copyPrompt('new')}
                  title="Kopiert nur die neuen Wörter (nach Pie-Chart) als ChatGPT Voice-Prompt"
                >
                  {#if copiedToastNew}
                    <span class="font-extrabold text-purple-600 dark:text-purple-400">✓</span>
                    <span>Neue Wörter kopiert!</span>
                  {:else}
                    <span class="text-base">✨</span>
                    <span>Nur neue Wörter kopieren ({sessionNewWords.length} Wörter)</span>
                  {/if}
                </button>
              </div>
            </div>

            <!-- Subtitle info & Quick link -->
            <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 flex-wrap gap-2 pt-0.5">
              <span class="flex items-center gap-1.5 flex-wrap">
                <span class="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Bereit: <strong>{sessionWords.length} Wörter</strong> ({sessionReviewWords.length} Wiederholungen + {sessionNewWords.length} Neue nach Pie-Chart)</span>
              </span>
              <div class="flex items-center gap-3">
                <button
                  type="button"
                  class="text-purple-600 dark:text-purple-400 font-semibold hover:underline cursor-pointer"
                  on:click={() => activeTab = 'distribution'}
                >
                  Pie-Chart Verteilung anpassen ➔
                </button>
                <a 
                  href="https://chatgpt.com" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  class="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-0.5"
                >
                  <span>ChatGPT Web ↗</span>
                </a>
              </div>
            </div>

            <!-- Controls: Karten aufklappen & Prompt Vorschau -->
            <div class="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <button
                type="button"
                class="text-xs font-semibold text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 flex items-center gap-1.5 cursor-pointer py-1"
                on:click={() => showSessionCards = !showSessionCards}
              >
                <svg class="w-4 h-4 transition-transform {showSessionCards ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
                <span>{showSessionCards ? 'Karten dieser Session einklappen' : `Karten für diese Session ansehen (${sessionWords.length} Wörter: ${sessionReviewWords.length} Review + ${sessionNewWords.length} Neu)`}</span>
              </button>

              <button
                type="button"
                class="text-xs font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer py-1"
                on:click={() => showPromptPreview = !showPromptPreview}
              >
                <span>{showPromptPreview ? '▲ Prompt-Vorschau schließen' : 'Prompt-Text ansehen'}</span>
              </button>
            </div>

            <!-- Optional Raw Prompt Preview Drawer -->
            {#if showPromptPreview}
              <div class="space-y-2 animate-in fade-in">
                <div class="flex items-center gap-2 text-xs">
                  <span class="text-slate-400 text-[11px]">Vorschau für:</span>
                  <button
                    type="button"
                    class="px-2 py-0.5 rounded text-xs font-semibold cursor-pointer {promptPreviewMode === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}"
                    on:click={() => promptPreviewMode = 'all'}
                  >
                    Alle ({sessionWords.length})
                  </button>
                  <button
                    type="button"
                    class="px-2 py-0.5 rounded text-xs font-semibold cursor-pointer {promptPreviewMode === 'review' ? 'bg-amber-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}"
                    on:click={() => promptPreviewMode = 'review'}
                  >
                    Nur Wiederholungen ({sessionReviewWords.length})
                  </button>
                  <button
                    type="button"
                    class="px-2 py-0.5 rounded text-xs font-semibold cursor-pointer {promptPreviewMode === 'new' ? 'bg-purple-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}"
                    on:click={() => promptPreviewMode = 'new'}
                  >
                    Nur neue Wörter ({sessionNewWords.length})
                  </button>
                </div>
                <div class="p-3.5 bg-slate-900 text-slate-200 rounded-xl text-xs font-mono max-h-60 overflow-y-auto whitespace-pre-wrap select-all border border-slate-800 shadow-inner">
                  {promptPreviewMode === 'all' ? chatGptPrompt : promptPreviewMode === 'review' ? chatGptReviewPrompt : chatGptNewPrompt}
                </div>
              </div>
            {/if}

          </div>

          <!-- Cards for this session: standardmäßig minimiert -->
          {#if showSessionCards}
            <div class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/80 dark:border-slate-800/80 space-y-3 animate-in fade-in">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>Karten dieser Session ({sessionWords.length} Wörter in {sessionWordChunks.length} Lern-Schritten)</span>
                </h3>
                <button
                  type="button"
                  class="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  on:click={() => showSessionCards = false}
                >
                  ✕ Schließen
                </button>
              </div>

              <div class="space-y-3">
                {#each sessionWordChunks as chunk, chunkIdx}
                  <div class="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 space-y-2">
                    <div class="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                      <span class="flex items-center gap-1.5">
                        <span class="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px]">
                          {chunkIdx + 1}
                        </span>
                        <span>Lern-Schritt {chunkIdx + 1}</span>
                      </span>
                      <span class="text-[10px] text-slate-400">{chunk.length} {chunk.length === 1 ? 'Wort' : 'Wörter'}</span>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {#each chunk as word}
                        {@const badge = getGenderBadge(word.gender, word.pos)}
                        {@const focus = getEffectiveFocus(word)}
                        {@const focusBadge = getFocusBadge(focus, word.repsRemaining, word.rewordStep, word.category)}
                        <div class="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                          <div class="flex items-center justify-between gap-1 flex-wrap">
                            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold border {badge.color}">
                              {badge.label.split(' ')[0]}
                            </span>
                            <span class="text-[9px] px-1.5 py-0.5 rounded font-bold border {focusBadge.color}">
                              {focusBadge.label.split(' • ')[0]}
                            </span>
                          </div>
                          <div class="font-bold text-sm text-slate-900 dark:text-white">
                            {word.word}
                          </div>
                          <div class="text-[11px] text-slate-500 dark:text-slate-400 italic truncate">
                            {word.meaning}
                          </div>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- YAML Import Section -->
          <div class="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/80 dark:border-slate-800/80 space-y-3.5">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 class="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>📥 ChatGPT-Ergebnis importieren (YAML)</span>
                </h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Füge hier nach deiner Sprach-Session das von ChatGPT generierte YAML ein (inkl. neuer Wörter!).
                </p>
              </div>

              <button
                type="button"
                class="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                on:click={loadSampleYaml}
              >
                Beispiel-YAML einfügen
              </button>
            </div>

            <!-- Textarea -->
            <div>
              <textarea
                bind:value={yamlInputText}
                rows="5"
                placeholder="```yaml&#10;session_summary:&#10;  words_practiced:&#10;    - word_id: 470&#10;      word: &quot;der Raum&quot;&#10;      rating: &quot;good&quot;&#10;  new_words_added:&#10;    - word: &quot;die Abkürzung&quot;&#10;      meaning: &quot;shortcut&quot;&#10;```"
                class="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              ></textarea>
            </div>

            <!-- Import Action Button -->
            <div class="flex items-center justify-between flex-wrap gap-2">
              <button
                type="button"
                class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                disabled={isImporting || !yamlInputText.trim()}
                on:click={handleImportYaml}
              >
                {#if isImporting}
                  <span class="animate-spin">⏳</span>
                  <span>Verarbeite...</span>
                {:else}
                  <span>✓ Fortschritt aus ChatGPT speichern</span>
                {/if}
              </button>

              {#if yamlInputText.trim()}
                <button
                  type="button"
                  class="text-xs text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                  on:click={() => yamlInputText = ''}
                >
                  Feld leeren
                </button>
              {/if}
            </div>

            <!-- Feedback Banner -->
            {#if importFeedback}
              <div class="p-4 rounded-xl border animate-in fade-in {importFeedback.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'} space-y-1">
                <div class="font-bold text-sm flex items-center gap-1.5">
                  <span>{importFeedback.type === 'success' ? '🎉' : '⚠️'}</span>
                  <span>{importFeedback.title}</span>
                </div>
                <div class="text-xs">
                  {importFeedback.message}
                </div>
                {#if importFeedback.type === 'success'}
                  <div class="text-xs font-semibold pt-1 text-emerald-800 dark:text-emerald-300">
                    Heute insgesamt geschafft: <strong>{importFeedback.todayTotal} von {userStats.dailyGoal} Wörtern</strong>.
                    {#if importFeedback.remainingToday > 0}
                      <span>(Noch {importFeedback.remainingToday} Wörter bis zum Tagesziel)</span>
                    {:else}
                      <span>(Tagesziel komplett erreicht! 🚀)</span>
                    {/if}
                  </div>
                {/if}
              </div>
            {/if}

          </div>

        </div>

      {:else if activeTab === 'words'}
        <!-- Tab 2: Wörter-Verzeichnis (Vocabulary Directory Explorer with ReWord details) -->
        <div class="space-y-3.5 animate-in fade-in duration-200">
          
          <!-- Metric Filter Buttons by Learning Focus / ReWord status -->
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-2.5">
            <button
              type="button"
              class="p-2.5 sm:p-3 rounded-xl transition-all text-left cursor-pointer border {wordFocusFilter === 'all' ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-500/20' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}"
              on:click={() => { wordFocusFilter = 'all'; wordsPage = 1; }}
            >
              <div class="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">Alle Nomen</div>
              <div class="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{totalWordsCount}</div>
              <div class="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Gesamter Wortschatz</div>
            </button>

            <!-- ✨ Neue ChatGPT Wörter -->
            <button
              type="button"
              class="p-2.5 sm:p-3 rounded-xl transition-all text-left cursor-pointer border {wordFocusFilter === 'chatgpt_only' ? 'bg-purple-50/80 dark:bg-purple-950/50 border-purple-300 dark:border-purple-700 ring-2 ring-purple-500/20' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}"
              on:click={() => { wordFocusFilter = 'chatgpt_only'; wordsPage = 1; }}
            >
              <div class="text-[10px] sm:text-xs font-semibold text-purple-600 dark:text-purple-400">✨ ChatGPT-Wörter</div>
              <div class="text-base sm:text-xl font-extrabold text-purple-700 dark:text-purple-300 mt-0.5">{chatGptWordsCount}</div>
              <div class="text-[10px] text-purple-500/80 dark:text-purple-400/70 mt-0.5">Gruppe: neue-chatgpt</div>
            </button>

            <!-- 🎯 Nur Genus lernen -->
            <button
              type="button"
              class="p-2.5 sm:p-3 rounded-xl transition-all text-left cursor-pointer border {wordFocusFilter === 'genus_only' ? 'bg-purple-50/80 dark:bg-purple-950/50 border-purple-300 dark:border-purple-700 ring-2 ring-purple-500/20' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}"
              on:click={() => { wordFocusFilter = 'genus_only'; wordsPage = 1; }}
            >
              <div class="text-[10px] sm:text-xs font-semibold text-purple-600 dark:text-purple-400">🎯 Nur Genus</div>
              <div class="text-base sm:text-xl font-extrabold text-purple-700 dark:text-purple-300 mt-0.5">{genusOnlyCount}</div>
              <div class="text-[10px] text-purple-500/80 dark:text-purple-400/70 mt-0.5">In ReWord gemeistert</div>
            </button>

            <!-- 🔄 In Wiederholung -->
            <button
              type="button"
              class="p-2.5 sm:p-3 rounded-xl transition-all text-left cursor-pointer border {wordFocusFilter === 'in_review' ? 'bg-amber-50/80 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 ring-2 ring-amber-500/20' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}"
              on:click={() => { wordFocusFilter = 'in_review'; wordsPage = 1; }}
            >
              <div class="text-[10px] sm:text-xs font-semibold text-amber-600 dark:text-amber-400">🔄 In Wiederholung</div>
              <div class="text-base sm:text-xl font-extrabold text-amber-700 dark:text-amber-300 mt-0.5">{inReviewCount}</div>
              <div class="text-[10px] text-amber-600/80 dark:text-amber-400/70 mt-0.5">Aktiver Review-Zyklus</div>
            </button>

            <!-- ✨ Wort + Genus -->
            <button
              type="button"
              class="p-2.5 sm:p-3 rounded-xl transition-all text-left cursor-pointer border {wordFocusFilter === 'word_and_genus' ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-500/20' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}"
              on:click={() => { wordFocusFilter = 'word_and_genus'; wordsPage = 1; }}
            >
              <div class="text-[10px] sm:text-xs font-semibold text-indigo-600 dark:text-indigo-400">✨ Wort + Genus</div>
              <div class="text-base sm:text-xl font-extrabold text-indigo-700 dark:text-indigo-300 mt-0.5">{wordAndGenusCount}</div>
              <div class="text-[10px] text-indigo-500/80 dark:text-indigo-400/70 mt-0.5">Noch neu</div>
            </button>

            <!-- ✓ Bereits bekannt -->
            <button
              type="button"
              class="p-2.5 sm:p-3 rounded-xl transition-all text-left cursor-pointer border {wordFocusFilter === 'already_known' ? 'bg-teal-50/80 dark:bg-teal-950/50 border-teal-300 dark:border-teal-700 ring-2 ring-teal-500/20' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}"
              on:click={() => { wordFocusFilter = 'already_known'; wordsPage = 1; }}
            >
              <div class="text-[10px] sm:text-xs font-semibold text-teal-600 dark:text-teal-400">✓ In ReWord bekannt</div>
              <div class="text-base sm:text-xl font-extrabold text-teal-700 dark:text-teal-300 mt-0.5">{alreadyKnownCount}</div>
              <div class="text-[10px] text-teal-600/80 dark:text-teal-400/70 mt-0.5">Übersprungen</div>
            </button>
          </div>

          <!-- Search & Controls Bar -->
          <div class="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 shadow-xs border border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
            <div class="relative">
              <input
                type="text"
                bind:value={wordsSearchQuery}
                on:input={() => wordsPage = 1}
                placeholder="Nomen oder Bedeutung suchen (z. B. Raum, room, Katze, Abkürzung)..."
                class="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0118 0z" />
              </svg>
            </div>

            <!-- Gender & Sort Filters -->
            <div class="flex items-center justify-between gap-2 flex-wrap text-xs">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-slate-400 text-[11px]">Filter:</span>
                {#each [
                  { id: 'all', label: 'Alle' },
                  { id: 'm', label: 'der' },
                  { id: 'f', label: 'die' },
                  { id: 'n', label: 'das' },
                  { id: 'verb', label: 'Verben' },
                  { id: 'adjective', label: 'Adjektive' },
                  { id: 'other', label: 'Andere' }
                ] as g}
                  <button
                    type="button"
                    class="px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer {wordGenderFilter === g.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}"
                    on:click={() => { wordGenderFilter = g.id as any; wordsPage = 1; }}
                  >
                    {g.label}
                  </button>
                {/each}

                <span class="text-slate-400 text-[11px] ml-2">Kategorie:</span>
                <select
                  bind:value={selectedTierFilter}
                  on:change={() => wordsPage = 1}
                  class="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer max-w-[170px] truncate"
                >
                  <option value="all">Alle Kategorien ({totalWordsCount})</option>
                  {#each ALL_CATEGORIES as cat}
                    <option value={cat.id}>{cat.icon} {cat.name} ({wordCountsByCategory[cat.id] || 0})</option>
                  {/each}
                </select>
              </div>

              <div class="flex items-center gap-1.5 text-xs text-slate-400">
                <span class="text-[11px]">Sortierung:</span>
                <select 
                  bind:value={wordSortOrder}
                  class="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-none outline-none font-semibold cursor-pointer"
                >
                  <option value="az">A – Z</option>
                  <option value="za">Z – A</option>
                  <option value="step_desc">Höchste ReWord-Stufe</option>
                  <option value="reps_desc">Wenigste Wiederholungen verbleibend</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Word List Cards with rich ReWord details -->
          <div class="space-y-2.5">
            {#each paginatedWordsList as word (word.wordId)}
              {@const badge = getGenderBadge(word.gender, word.pos)}
              {@const focus = getEffectiveFocus(word)}
              {@const focusBadge = getFocusBadge(focus, word.repsRemaining, word.rewordStep, word.category)}
              <div class="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-2.5 transition-all">
                
                <div class="flex items-start justify-between gap-2 flex-wrap">
                  <div class="space-y-1">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold border {badge.color}">
                        {badge.label.split(' ')[0]}
                      </span>
                      <span class="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                        {word.word}
                      </span>
                      {#if word.meaning}
                        <span class="text-xs text-slate-500 dark:text-slate-400 italic">
                          „{word.meaning}“
                        </span>
                      {/if}
                    </div>

                    <div class="flex items-center gap-2 flex-wrap text-[11px]">
                      {#if word.category === 'neue-chatgpt-woerter'}
                        <span class="px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
                          ★ neue-chatgpt-woerter
                        </span>
                      {:else}
                        <span class="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                          Kategorie: {word.category}
                        </span>
                      {/if}

                      {#if word.rewordQueue > 0}
                        <span class="text-slate-400">
                          ReWord: Queue {word.rewordQueue} (Stufe {word.rewordStep})
                        </span>
                      {/if}
                    </div>
                  </div>

                  <!-- Focus Badge & Interactive Changer -->
                  <div class="flex items-center gap-2 flex-wrap">
                    {#if word.category === 'neue-chatgpt-woerter'}
                      <button
                        type="button"
                        class="text-[11px] text-rose-500 hover:text-rose-700 cursor-pointer px-1.5 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Wort aus ChatGPT-Gruppe entfernen"
                        on:click={() => removeCustomWord(word.wordId)}
                      >
                        Löschen ✕
                      </button>
                    {/if}

                    <button
                      type="button"
                      class="px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer {focusBadge.color} hover:opacity-90 active:scale-95"
                      title="Klicken, um den Lernfokus für dieses Wort umzuschalten"
                      on:click={() => cycleLearningFocus(word)}
                    >
                      <span>{focusBadge.label}</span>
                      <span class="opacity-60 ml-1 text-[10px]">✎</span>
                    </button>

                    <button
                      type="button"
                      class="text-xs text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer py-1"
                      on:click={() => expandedWordId = expandedWordId === word.wordId ? null : word.wordId}
                    >
                      {expandedWordId === word.wordId ? 'Schließen ▲' : 'Details & Sätze ▼'}
                    </button>
                  </div>
                </div>

                <!-- Expanded Details -->
                {#if expandedWordId === word.wordId}
                  <div class="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2 animate-in fade-in">
                    
                    <div class="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1">
                      <div class="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span>Lernziel: {focusBadge.label}</span>
                        <span class="text-[10px] text-slate-400 font-normal">Klicke oben auf das Badge, um den Modus zu ändern</span>
                      </div>
                      <div class="text-slate-500 dark:text-slate-400">
                        {focusBadge.desc}
                      </div>
                    </div>

                    <!-- Example Sentences -->
                    {#if word.cases && word.cases.length > 0}
                      <div class="space-y-1">
                        <div class="text-[11px] font-bold text-slate-500 dark:text-slate-400">Fälle & Beispielsätze:</div>
                        {#each word.cases as c}
                          <div class="text-xs flex items-start gap-2">
                            <span class="px-1.5 py-0.2 uppercase font-bold text-[9px] rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {c.case}
                            </span>
                            <div>
                              <span class="text-slate-800 dark:text-slate-200 font-medium">{c.sentence}</span>
                              <span class="text-slate-400 dark:text-slate-500 italic ml-1">({c.translation})</span>
                            </div>
                          </div>
                        {/each}
                      </div>
                    {:else if word.examples && word.examples.length > 0}
                      <div class="space-y-1">
                        <div class="text-[11px] font-bold text-slate-500 dark:text-slate-400">ReWord-Beispielsätze:</div>
                        {#each word.examples as ex}
                          <div class="text-xs text-slate-800 dark:text-slate-200">
                            <span>• {ex.german}</span>
                            <span class="text-slate-400 dark:text-slate-500 italic ml-1">({ex.english})</span>
                          </div>
                        {/each}
                      </div>
                    {/if}

                  </div>
                {/if}

              </div>
            {/each}

            {#if hasMoreWords}
              <div class="pt-3 text-center">
                <button
                  type="button"
                  class="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer shadow-xs"
                  on:click={() => wordsPage += 1}
                >
                  Mehr Wörter laden ({paginatedWordsList.length} von {filteredWordsList.length}) ➔
                </button>
              </div>
            {/if}
          </div>

        </div>

      {:else}
        <!-- Tab 3: Verteilung & Modifizierbares Pie-Chart -->
        <div class="space-y-4 animate-in fade-in duration-200">
          
          <!-- Top Explanation Card -->
          <div class="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/80 dark:border-slate-800/80 space-y-5">
            <div>
              <h2 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>🥧 Wortgruppen & Verteilung (Alle 66 Kategorien)</span>
              </h2>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Stelle hier für alle 66 Wortgruppen aus deinem ReWord-Backup und neuen ChatGPT-Wörtern ein, zu wie viel Prozent neue Wörter aus welchen Kategorien in dein Training gemischt werden.
              </p>
            </div>

            <!-- Visual SVG Pie Chart + Presets Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-2">
              
              <!-- SVG Donut / Pie Chart (col 5) -->
              <div class="lg:col-span-5 flex flex-col items-center justify-center relative">
                <div class="w-60 h-60 relative flex items-center justify-center">
                  <svg class="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                    {#if pieSlices.length === 0}
                      <circle cx="100" cy="100" r="80" class="fill-slate-100 dark:fill-slate-800 stroke-slate-200 dark:stroke-slate-700" stroke-width="2" />
                    {:else}
                      {#each pieSlices as slice}
                        {#if slice.pathD === 'FULL'}
                          <circle cx="100" cy="100" r="80" fill={slice.color} />
                        {:else if slice.pathD}
                          <path d={slice.pathD} fill={slice.color} class="transition-all duration-300 hover:opacity-90 cursor-pointer" />
                        {/if}
                      {/each}
                    {/if}

                    <!-- Center Donut Hole -->
                    <circle cx="100" cy="100" r="48" class="fill-white dark:fill-slate-900" />
                  </svg>

                  <!-- Text in center of Donut -->
                  <div class="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    {#if totalWeightsSum > 0}
                      <span class="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                        {pieSlices.length} aktiv
                      </span>
                      <span class="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">100% Mix</span>
                    {:else}
                      <span class="text-xs font-bold text-slate-400 leading-tight">Keine aktiv</span>
                      <span class="text-[10px] text-slate-400">Unten wählen</span>
                    {/if}
                  </div>
                </div>

                <!-- Active Slices Legend -->
                <div class="flex items-center justify-center flex-wrap gap-1.5 mt-3 max-w-sm">
                  {#each pieSlices as slice}
                    <span 
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60"
                      style="border-left: 3px solid {slice.color};"
                    >
                      <span>{slice.icon}</span>
                      <span class="truncate max-w-[120px] text-slate-800 dark:text-slate-200">{slice.name}</span>
                      <span class="font-extrabold text-indigo-600 dark:text-indigo-400">{slice.percent}%</span>
                    </span>
                  {/each}
                </div>
              </div>

              <!-- Presets Column (col 7) -->
              <div class="lg:col-span-7 space-y-2.5">
                <div class="text-xs font-bold text-slate-700 dark:text-slate-300">
                  ⚡ Beliebte Schnell-Voreinstellungen:
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    class="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-500 text-left transition-all cursor-pointer bg-slate-50 dark:bg-slate-800/40"
                    on:click={() => setPreset('chatgpt')}
                  >
                    <div class="text-xs font-bold text-purple-600 dark:text-purple-400">✨ Nur ChatGPT-Wörter (100%)</div>
                    <div class="text-[10px] text-slate-500 dark:text-slate-400">Trainiere ausschließlich die neu entdeckten Vokabeln</div>
                  </button>

                  <button
                    type="button"
                    class="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 text-left transition-all cursor-pointer bg-slate-50 dark:bg-slate-800/40"
                    on:click={() => setPreset('top1000')}
                  >
                    <div class="text-xs font-bold text-indigo-600 dark:text-indigo-400">🥇 Top 1000 Fokus</div>
                    <div class="text-[10px] text-slate-500 dark:text-slate-400">70% Top 1000 • 30% ChatGPT-Wörter</div>
                  </button>

                  <button
                    type="button"
                    class="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-500 text-left transition-all cursor-pointer bg-slate-50 dark:bg-slate-800/40"
                    on:click={() => setPreset('medical')}
                  >
                    <div class="text-xs font-bold text-rose-600 dark:text-rose-400">🩺 Medizin & Gesundheit</div>
                    <div class="text-[10px] text-slate-500 dark:text-slate-400">Krankheiten, Anatomie, Klinik & ChatGPT</div>
                  </button>

                  <button
                    type="button"
                    class="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500 text-left transition-all cursor-pointer bg-slate-50 dark:bg-slate-800/40"
                    on:click={() => setPreset('nature')}
                  >
                    <div class="text-xs font-bold text-emerald-600 dark:text-emerald-400">🌿 Natur, Vögel & Wetter</div>
                    <div class="text-[10px] text-slate-500 dark:text-slate-400">Pflanzen, Vögel, Garten & Wetter</div>
                  </button>

                  <button
                    type="button"
                    class="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-500 text-left transition-all cursor-pointer bg-slate-50 dark:bg-slate-800/40"
                    on:click={() => setPreset('tiers')}
                  >
                    <div class="text-xs font-bold text-sky-600 dark:text-sky-400">📚 Grundwortschatz (Tiers 1-4)</div>
                    <div class="text-[10px] text-slate-500 dark:text-slate-400">Top 1000 bis 4000 gestaffelt + ChatGPT</div>
                  </button>

                  <button
                    type="button"
                    class="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 text-left transition-all cursor-pointer bg-slate-50 dark:bg-slate-800/40"
                    on:click={() => setPreset('reset')}
                  >
                    <div class="text-xs font-bold text-slate-600 dark:text-slate-300">🧹 Alle 66 auf 0% zurücksetzen</div>
                    <div class="text-[10px] text-slate-400">Setzt alle Schieberegler auf Null</div>
                  </button>
                </div>
              </div>

            </div>

            <!-- Search and Filter Bar for All 66 Categories -->
            <div class="pt-5 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h3 class="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🎛️ Schieberegler für alle 66 Kategorien</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {visibleCategoryDefs.length} angezeigt
                    </span>
                  </h3>
                  <div class="text-[11px] text-slate-400">
                    Passe beliebig viele Kategorien gleichzeitig an. Die Prozentanteile im Pie-Chart passen sich automatisch an.
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                    on:click={() => setVisibleCategoriesWeight(15)}
                    title="Setzt alle aktuell angezeigten Kategorien auf 15%"
                  >
                    +15% für Ansicht
                  </button>
                  <button
                    type="button"
                    class="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                    on:click={() => setVisibleCategoriesWeight(0)}
                    title="Setzt alle aktuell angezeigten Kategorien auf 0%"
                  >
                    0% für Ansicht
                  </button>
                </div>
              </div>

              <!-- Search input -->
              <div class="relative">
                <input
                  type="text"
                  bind:value={pieCategorySearch}
                  placeholder="🔍 In allen 66 Kategorien suchen (z. B. Vögel, Medizin, Top 1000, Küche, Zeit, Sport...)"
                  class="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                {#if pieCategorySearch}
                  <button
                    type="button"
                    class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs cursor-pointer"
                    on:click={() => pieCategorySearch = ''}
                  >
                    ✕
                  </button>
                {/if}
              </div>

              <!-- Category Groups Chips -->
              <div class="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {#each CATEGORY_GROUPS as group}
                  <button
                    type="button"
                    class="px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-all cursor-pointer {pieSelectedGroup === group ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}"
                    on:click={() => pieSelectedGroup = group}
                  >
                    {group}
                  </button>
                {/each}
              </div>
            </div>

            <!-- Category Sliders Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {#if visibleCategoryDefs.length === 0}
                <div class="col-span-full text-center py-8 text-slate-400 text-xs">
                  Keine Kategorien für „{pieCategorySearch || pieSelectedGroup}“ gefunden.
                </div>
              {:else}
                {#each visibleCategoryDefs as cat}
                  {@const weight = groupWeights[cat.id] || 0}
                  {@const percent = totalWeightsSum > 0 ? Math.round((weight / totalWeightsSum) * 100) : 0}
                  {@const count = wordCountsByCategory[cat.id] || 0}
                  <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border {weight > 0 ? 'border-indigo-300 dark:border-indigo-600 shadow-xs' : 'border-slate-200 dark:border-slate-700/70'} space-y-2.5 transition-all">
                    
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex items-center gap-2.5 min-w-0">
                        <span class="text-xl shrink-0">{cat.icon}</span>
                        <div class="min-w-0">
                          <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                              {cat.name}
                            </span>
                            <span class="text-[9px] font-semibold px-1.5 py-0.2 rounded-md bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {cat.group}
                            </span>
                          </div>
                          <div class="text-[10px] text-slate-400 truncate">
                            {cat.desc} • <span class="font-medium text-slate-500 dark:text-slate-300">{count} Wörter</span>
                          </div>
                        </div>
                      </div>

                      <div class="text-right shrink-0">
                        <span 
                          class="px-2 py-0.5 rounded-md font-extrabold text-xs shadow-2xs border {weight > 0 ? 'bg-white dark:bg-slate-900 border-indigo-400 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'}"
                        >
                          {percent}%
                        </span>
                      </div>
                    </div>

                    <!-- Range Slider -->
                    <div class="space-y-1">
                      <input 
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={weight}
                        on:input={(e) => updateWeight(cat.id, Number((e.target as HTMLInputElement).value))}
                        class="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <div class="flex items-center justify-between text-[9px] text-slate-400">
                        <span>Gewichtung: {weight}</span>
                        <div class="flex items-center gap-1">
                          <button 
                            type="button"
                            class="px-1 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-[9px] cursor-pointer"
                            on:click={() => updateWeight(cat.id, 0)}
                          >0%</button>
                          <button 
                            type="button"
                            class="px-1 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-[9px] cursor-pointer"
                            on:click={() => updateWeight(cat.id, 10)}
                          >10%</button>
                          <button 
                            type="button"
                            class="px-1 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-[9px] cursor-pointer"
                            on:click={() => updateWeight(cat.id, 25)}
                          >25%</button>
                          <button 
                            type="button"
                            class="px-1 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-[9px] cursor-pointer"
                            on:click={() => updateWeight(cat.id, 50)}
                          >50%</button>
                        </div>
                      </div>
                    </div>

                  </div>
                {/each}
              {/if}
            </div>

          </div>

          <!-- Section: Manuell neue Wörter zu 'neue-chatgpt-woerter' hinzufügen -->
          <div class="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/80 dark:border-slate-800/80 space-y-3.5">
            <div>
              <h3 class="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>➕ Neues Wort zu 'neue-chatgpt-woerter' hinzufügen</span>
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Neue Vokabeln werden automatisch beim YAML-Import aus ChatGPT hinzugefügt – oder du trägst sie hier direkt ein:
              </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                bind:value={newWordInput}
                placeholder="Nomen (z. B. die Abkürzung)..."
                class="sm:col-span-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              />

              <input
                type="text"
                bind:value={newWordMeaning}
                placeholder="Bedeutung (z. B. shortcut)..."
                class="sm:col-span-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              />

              <div class="flex items-center gap-2 sm:col-span-1">
                <select 
                  bind:value={newWordGender}
                  class="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="m">der (Maskulin)</option>
                  <option value="f">die (Feminin)</option>
                  <option value="n">das (Neutrum)</option>
                </select>

                <button
                  type="button"
                  class="flex-1 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                  disabled={!newWordInput.trim()}
                  on:click={handleCreateManualWord}
                >
                  Hinzufügen
                </button>
              </div>
            </div>

            {#if showAddWordSuccess}
              <div class="text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                ✓ Wort erfolgreich in die Gruppe 'neue-chatgpt-woerter' gespeichert!
              </div>
            {/if}

            <!-- Current list of custom ChatGPT words -->
            {#if customAddedWords.length > 0}
              <div class="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div class="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Aktuell gespeicherte ChatGPT-Wörter ({customAddedWords.length}):
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {#each customAddedWords as cw}
                    {@const badge = getGenderBadge(cw.gender, cw.pos)}
                    <div class="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                      <div class="flex items-center gap-1.5 truncate">
                        <span class="px-1 py-0.2 rounded text-[10px] font-bold border {badge.color}">
                          {badge.label.split(' ')[0]}
                        </span>
                        <span class="font-bold text-slate-800 dark:text-slate-200">{cw.word}</span>
                        {#if cw.meaning}
                          <span class="text-slate-400 italic truncate">({cw.meaning})</span>
                        {/if}
                      </div>
                      <button
                        type="button"
                        class="text-slate-400 hover:text-rose-500 cursor-pointer ml-2 text-xs"
                        on:click={() => removeCustomWord(cw.wordId)}
                        title="Entfernen"
                      >
                        ✕
                      </button>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

          </div>

        </div>
      {/if}
    </main>

  </div>

  <!-- Settings Modal -->
  {#if showSettingsModal}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-bold text-slate-900 dark:text-white">Einstellungen</h3>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-sm font-bold cursor-pointer"
            on:click={() => showSettingsModal = false}
          >
            ✕
          </button>
        </div>

        <!-- Daily Goal Setting -->
        <div class="space-y-1.5">
          <label class="text-xs font-bold text-slate-700 dark:text-slate-300">
            Tagesziel (Wörter pro Tag)
          </label>
          <div class="flex items-center gap-1.5 flex-wrap">
            {#each [5, 10, 15, 25, 50] as goal}
              <button
                type="button"
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer {userStats.dailyGoal === goal ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}"
                on:click={() => { userStats.dailyGoal = goal; saveUserStats(userStats); }}
              >
                {goal} Wörter
              </button>
            {/each}
          </div>
        </div>

        <!-- Category Tier Filter -->
        <div class="space-y-1.5">
          <label class="text-xs font-bold text-slate-700 dark:text-slate-300">
            Kategorie / Tier-Umfang
          </label>
          <div class="flex items-center gap-1.5 flex-wrap">
            {#each [
              { id: 'all', label: 'Alle' },
              { id: 'neue-chatgpt-woerter', label: '✨ ChatGPT' },
              { id: 'top1000', label: 'Top 1000' },
              { id: 'top2000', label: 'Top 2000' },
              { id: 'top3000', label: 'Top 3000' },
              { id: 'top4000', label: 'Top 4000' }
            ] as tier}
              <button
                type="button"
                class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer {selectedTierFilter === tier.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}"
                on:click={() => selectedTierFilter = tier.id}
              >
                {tier.label}
              </button>
            {/each}

            <!-- All 66 categories dropdown -->
            <select
              bind:value={selectedTierFilter}
              class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <option value="all">Weitere Kategorien (alle 66)...</option>
              {#each ALL_CATEGORIES as cat}
                <option value={cat.id}>{cat.icon} {cat.name} ({wordCountsByCategory[cat.id] || 0})</option>
              {/each}
            </select>
          </div>
        </div>

        <!-- Skip People & Professions toggle -->
        <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <div class="text-xs font-bold text-slate-800 dark:text-slate-200">Personen & Berufe überspringen</div>
            <div class="text-[11px] text-slate-400">z. B. Arzt, Lehrerin (Geschlecht meist offensichtlich)</div>
          </div>
          <button
            type="button"
            class="w-10 h-6 rounded-full transition-colors relative cursor-pointer {userStats.skipPeopleAndProfessions ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}"
            on:click={() => { userStats.skipPeopleAndProfessions = !userStats.skipPeopleAndProfessions; saveUserStats(userStats); }}
          >
            <div class="w-4 h-4 rounded-full bg-white transition-transform absolute top-1 {userStats.skipPeopleAndProfessions ? 'left-5' : 'left-1'}"></div>
          </button>
        </div>

        <!-- Exclude already known / mastered words from training -->
        <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <div class="text-xs font-bold text-slate-800 dark:text-slate-200">Bereits bekannte Wörter ausschließen</div>
            <div class="text-[11px] text-slate-400">Schließt in ReWord als bekannt markierte Wörter (z. B. Hund, Katze, Fisch) aus den Sessions aus</div>
          </div>
          <button
            type="button"
            class="w-10 h-6 rounded-full transition-colors relative cursor-pointer {userStats.excludeAlreadyKnownWords !== false ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}"
            on:click={() => { userStats.excludeAlreadyKnownWords = userStats.excludeAlreadyKnownWords === false ? true : false; saveUserStats(userStats); }}
          >
            <div class="w-4 h-4 rounded-full bg-white transition-transform absolute top-1 {userStats.excludeAlreadyKnownWords !== false ? 'left-5' : 'left-1'}"></div>
          </button>
        </div>

        <!-- Reset Button -->
        <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            class="text-xs font-semibold text-rose-500 hover:text-rose-700 cursor-pointer"
            on:click={() => showResetConfirm = true}
          >
            Fortschritt zurücksetzen
          </button>
          <button
            type="button"
            class="px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs cursor-pointer"
            on:click={() => showSettingsModal = false}
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Reset Confirmation Modal -->
  {#if showResetConfirm}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div class="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
        <h4 class="text-sm font-bold text-slate-900 dark:text-white">Fortschritt wirklich zurücksetzen?</h4>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Alle bisherigen Wiederholungs-Intervalle, Statistiken, ChatGPT-Wörter und manuellen Einstellungen dieses Projekts werden gelöscht.
        </p>
        <div class="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            on:click={() => showResetConfirm = false}
          >
            Abbrechen
          </button>
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
            on:click={handleResetAllData}
          >
            Ja, zurücksetzen
          </button>
        </div>
      </div>
    </div>
  {/if}

</div>
