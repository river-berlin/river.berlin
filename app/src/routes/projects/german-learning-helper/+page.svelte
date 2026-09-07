<script lang="ts">
  import { onMount } from 'svelte';
  import type { 
    StorySession, 
    Question, 
    OpenRouterConfig 
  } from './lib/types';
  import { DEMO_STORY_SESSION } from './lib/demoData';
  import { 
    DEFAULT_MODEL, 
    verifyApiKey,
    continueStoryWithAIStream, 
    evaluateQuestionAnswerStream, 
    evaluateContinuationStream 
  } from './lib/openrouter';
  import { 
    downloadAndLoad10kGnad, 
    getRandomArticle, 
    getRandomArticleWithIndex,
    getArticleByIndex,
    deriveTitleFromArticle,
    generateQuestionsOnlyStream,
    type NewsArticle 
  } from './lib/huggingfaceDataset';
  import { renderMarkdown } from './lib/markdown';
  import { flashcards } from './lib/flashcards';
  import AudioReader from './lib/AudioReader.svelte';
  import SelectionTranslator from './lib/SelectionTranslator.svelte';
  import FlashcardsModal from './lib/FlashcardsModal.svelte';
  import ArticleSearchModal from './lib/ArticleSearchModal.svelte';
  import { getCachedQuestions, saveCachedQuestions } from './lib/questionsCache';

  // Persistence keys
  const STORAGE_KEY_API_KEY = 'german_helper_openrouter_key';
  const STORAGE_KEY_SESSION = 'german_helper_session_v6';

  // Configuration state
  let apiKey = '';
  let inputApiKey = '';
  let showApiKeyModal = false;
  let showApiKeyText = false;
  let showFlashcardsModal = false;
  let showArticleSearchModal = false;
  let isApiKeyVerified = false;
  let isVerifyingKey = false;
  let modalErrorMessage: string | null = null;
  let isQuestionsFromCache = false;

  // URL & Generation parameters
  let selectedModel: string = DEFAULT_MODEL;
  let currentArticleNum: number | null = null;
  let currentSeed: number | null = null;
  let copiedLink = false;
  let copiedLinkTimer: any = null;

  // Application session state
  let session: StorySession = DEMO_STORY_SESSION;
  let activeChapterIndex = 0;

  // Active chapter
  $: currentChapterItem = session.chapters[activeChapterIndex] || session.chapters[0];
  $: currentChapter = currentChapterItem.chapter;

  // Abort Controllers for cancellation
  let questionAbortControllers: Record<string, AbortController> = {};
  let continuationAbortController: AbortController | null = null;
  let articleGenerationAbortController: AbortController | null = null;
  let storyContinuationAbortController: AbortController | null = null;

  // UI state & Streaming texts
  let isLoadingDataset = false;
  let isStreamingQuestions = false;
  let streamingQuestionsText = '';
  let hfDatasetStatus = '';

  let isContinuingStory = false;
  let streamingNextChapterText = '';

  let isEvaluatingContinuation = false;
  let pageErrorMessage: string | null = null;
  let contentContainer: HTMLElement | null = null;

  // Resizable two-column splitter state (Text vs Questions)
  let splitPercent = 58; // percentage width for the left column
  let isDraggingSplitter = false;
  let splitterContainerRef: HTMLElement | null = null;

  function handleSplitterPointerDown(e: PointerEvent) {
    e.preventDefault();
    isDraggingSplitter = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handleSplitterPointerMove(e: PointerEvent) {
    if (!isDraggingSplitter || !splitterContainerRef) return;
    const rect = splitterContainerRef.getBoundingClientRect();
    if (rect.width <= 0) return;
    const clientX = e.clientX;
    const newPercent = ((clientX - rect.left) / rect.width) * 100;
    // Clamp between 32% and 75%
    splitPercent = Math.min(Math.max(newPercent, 32), 75);
  }

  function handleSplitterPointerUp(e: PointerEvent) {
    if (isDraggingSplitter) {
      isDraggingSplitter = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('german_helper_split_percent', splitPercent.toFixed(1));
      }
    }
  }

  // In-memory cache for downloaded articles
  let loadedArticles: NewsArticle[] | null = null;

  function readUrlParams(): { articleNum?: number; modelId?: string; seedVal?: number } {
    if (typeof window === 'undefined') return {};
    const searchParams = new URLSearchParams(window.location.search);
    const articleParam = searchParams.get('article');
    const modelParam = searchParams.get('model');
    const seedParam = searchParams.get('seed');

    const parsedArticle = articleParam ? parseInt(articleParam, 10) : undefined;
    const parsedSeed = seedParam !== null && seedParam !== '' && !isNaN(parseInt(seedParam, 10))
      ? parseInt(seedParam, 10)
      : undefined;

    return {
      articleNum: parsedArticle && !isNaN(parsedArticle) ? parsedArticle : undefined,
      modelId: modelParam && modelParam.trim() ? modelParam.trim() : undefined,
      seedVal: parsedSeed
    };
  }

  function updateUrlParams(articleNum: number, modelId: string, seedVal: number) {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('article', String(articleNum));
    url.searchParams.set('model', modelId);
    url.searchParams.set('seed', String(seedVal));
    window.history.replaceState(window.history.state, '', url.toString());
  }

  function handleCopyShareLink() {
    if (typeof window === 'undefined') return;
    if (currentArticleNum && currentSeed !== null) {
      updateUrlParams(currentArticleNum, selectedModel, currentSeed);
    }
    navigator.clipboard.writeText(window.location.href);
    copiedLink = true;
    if (copiedLinkTimer) clearTimeout(copiedLinkTimer);
    copiedLinkTimer = setTimeout(() => {
      copiedLink = false;
    }, 2000);
  }

  onMount(async () => {
    // Initialize flashcards
    flashcards.init();

    // 1. Parse URL query parameters
    const urlParams = readUrlParams();
    if (urlParams.modelId) {
      selectedModel = urlParams.modelId;
    }
    currentSeed = urlParams.seedVal !== undefined ? urlParams.seedVal : 0;
    if (urlParams.articleNum !== undefined) {
      currentArticleNum = urlParams.articleNum;
    }

    // Load persisted API key
    const savedKey = localStorage.getItem(STORAGE_KEY_API_KEY);
    if (savedKey && savedKey.trim()) {
      apiKey = savedKey.trim();
      inputApiKey = savedKey.trim();
      
      // Auto-verify saved key
      isVerifyingKey = true;
      const res = await verifyApiKey(apiKey);
      isVerifyingKey = false;
      if (res.valid) {
        isApiKeyVerified = true;
      } else {
        isApiKeyVerified = false;
        apiKey = '';
        localStorage.removeItem(STORAGE_KEY_API_KEY);
      }
    }

    // Load persisted session or default to clean demo story
    const savedSessionStr = localStorage.getItem(STORAGE_KEY_SESSION);
    if (savedSessionStr) {
      try {
        const parsed = JSON.parse(savedSessionStr);
        if (parsed && parsed.chapters && parsed.chapters.length > 0) {
          session = parsed;
          activeChapterIndex = parsed.currentChapterIndex || 0;
        }
      } catch (e) {
        console.warn('Fehler beim Laden der Sitzung:', e);
        session = JSON.parse(JSON.stringify(DEMO_STORY_SESSION));
      }
    } else {
      session = JSON.parse(JSON.stringify(DEMO_STORY_SESSION));
    }

    // Load persisted column split preference
    const savedSplit = localStorage.getItem('german_helper_split_percent');
    if (savedSplit) {
      const parsedSplit = parseFloat(savedSplit);
      if (!isNaN(parsedSplit) && parsedSplit >= 30 && parsedSplit <= 75) {
        splitPercent = parsedSplit;
      }
    }

    // Silently pre-load 10kGNAD articles from IndexedDB cache
    downloadAndLoad10kGnad().then(async (cached) => {
      if (cached && cached.length > 0) {
        loadedArticles = cached;
        // If an article was in URL and API key is verified, load it!
        if (urlParams.articleNum !== undefined) {
          if (isApiKeyVerified) {
            await handleLoadNewsArticle(urlParams.articleNum, urlParams.seedVal !== undefined ? urlParams.seedVal : 0, urlParams.modelId);
          }
        } else {
          // If no article in URL, pre-assign random article & default seed 0 to URL so sharing is instant
          const res = getRandomArticleWithIndex(loadedArticles);
          currentArticleNum = res.index;
          currentSeed = urlParams.seedVal !== undefined ? urlParams.seedVal : 0;
          updateUrlParams(currentArticleNum, selectedModel, currentSeed);
        }
      }
    }).catch(() => {});
  });

  function persistSession() {
    session.updatedAt = Date.now();
    session.currentChapterIndex = activeChapterIndex;
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
  }

  function getOpenRouterConfig(): OpenRouterConfig {
    return {
      apiKey: apiKey.trim(),
      model: selectedModel || DEFAULT_MODEL,
      siteUrl: typeof window !== 'undefined' ? window.location.origin : 'https://river.berlin',
      siteName: 'river.berlin German Learning Helper',
      seed: currentSeed !== null ? currentSeed : 0
    };
  }

  async function handleOpenArticleSearch() {
    showArticleSearchModal = true;
    if (!loadedArticles || loadedArticles.length === 0) {
      isLoadingDataset = true;
      try {
        loadedArticles = await downloadAndLoad10kGnad((status) => {
          hfDatasetStatus = status;
        });
      } catch (err: any) {
        console.warn('Fehler beim Laden des Datensatzes für Suche:', err);
      } finally {
        isLoadingDataset = false;
      }
    }
  }

  function handleSelectArticleFromSearch(articleNum: number) {
    handleLoadNewsArticle(articleNum, 0, selectedModel);
  }

  // Handle loading a REAL news article with INSTANT text display and separate questions stream
  async function handleLoadNewsArticle(targetArticleNum?: number, targetSeed?: number, targetModel?: string) {
    if (isLoadingDataset || isStreamingQuestions) {
      handleCancelArticleGeneration();
      return;
    }

    if (!isApiKeyVerified || !apiKey.trim()) {
      showApiKeyModal = true;
      return;
    }

    const controller = new AbortController();
    articleGenerationAbortController = controller;

    pageErrorMessage = null;
    hfDatasetStatus = '';

    try {
      // 1. Ensure dataset is available in memory
      if (!loadedArticles || loadedArticles.length === 0) {
        isLoadingDataset = true;
        hfDatasetStatus = 'Lade 10kGNAD-Datensatz von Hugging Face...';
        loadedArticles = await downloadAndLoad10kGnad((status) => {
          hfDatasetStatus = status;
        });
        isLoadingDataset = false;
        hfDatasetStatus = '';
      }

      if (controller.signal.aborted) return;

      // 2. Select article by target index or random
      let selectedArticle: NewsArticle;
      let articleIndex: number;

      if (targetArticleNum !== undefined && targetArticleNum > 0) {
        const res = getArticleByIndex(loadedArticles, targetArticleNum);
        selectedArticle = res.article;
        articleIndex = res.index;
      } else {
        const res = getRandomArticleWithIndex(loadedArticles);
        selectedArticle = res.article;
        articleIndex = res.index;
      }

      // Default seed is 0 when searching or loading a new article
      const seed = targetSeed !== undefined ? targetSeed : 0;
      const model = targetModel || selectedModel || DEFAULT_MODEL;

      currentArticleNum = articleIndex;
      currentSeed = seed;
      selectedModel = model;

      // Synchronize URL search params
      updateUrlParams(currentArticleNum, selectedModel, currentSeed);

      const title = deriveTitleFromArticle(selectedArticle);

      // Check Rolling Cache (last 10 articles by articleNum + seed + model)
      const cachedQuestions = getCachedQuestions(currentArticleNum, currentSeed, selectedModel);
      const hasCachedQuestions = Boolean(cachedQuestions && cachedQuestions.length > 0);
      isQuestionsFromCache = hasCachedQuestions;

      // 3. ZERO DELAY: Display the article immediately (with cached questions if available)
      session = {
        id: `session-${Date.now()}`,
        title,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        difficulty: 'C1',
        genre: `Journalismus (${selectedArticle.category}) • Artikel #${currentArticleNum}`,
        chapters: [
          {
            chapter: {
              id: `ch-1-${Date.now()}`,
              chapterNumber: 1,
              titleGerman: title,
              storyGerman: selectedArticle.text,
              vocabulary: [], // Wortschatz removed
              questions: hasCachedQuestions ? cachedQuestions! : [],
              cefrLevel: 'C1',
              genre: selectedArticle.category
            },
            userContinuation: '',
            continuationEvaluation: null
          }
        ],
        currentChapterIndex: 0
      };

      activeChapterIndex = 0;
      persistSession();
      session = { ...session };

      if (hasCachedQuestions) {
        isStreamingQuestions = false;
        streamingQuestionsText = '';
        return; // Zero delay instant display from cache!
      }

      // 4. Stream questions separately into the questions section using the deterministic seed
      isStreamingQuestions = true;
      streamingQuestionsText = '';

      const generatedQuestions = await generateQuestionsOnlyStream(
        getOpenRouterConfig(),
        selectedArticle,
        (accumulated) => {
          if (!controller.signal.aborted) {
            streamingQuestionsText = accumulated;
          }
        },
        controller.signal
      );

      if (!controller.signal.aborted && generatedQuestions.length > 0) {
        session.chapters[0].chapter.questions = generatedQuestions;
        streamingQuestionsText = '';
        // Save to rolling cache (stores up to 10 articles)
        saveCachedQuestions(currentArticleNum, currentSeed, selectedModel, generatedQuestions);
        persistSession();
        session = { ...session };
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        return; // Cancelled cleanly
      }
      console.error(err);
      pageErrorMessage = err.message || 'Fehler beim Laden des Zeitungsartikels.';
    } finally {
      articleGenerationAbortController = null;
      isLoadingDataset = false;
      isStreamingQuestions = false;
      streamingQuestionsText = '';
      hfDatasetStatus = '';
    }
  }

  // Cancel in-progress article or questions generation
  function handleCancelArticleGeneration() {
    if (articleGenerationAbortController) {
      articleGenerationAbortController.abort();
      articleGenerationAbortController = null;
    }
    isLoadingDataset = false;
    isStreamingQuestions = false;
    streamingQuestionsText = '';
    hfDatasetStatus = '';
  }

  // Handle streaming a question answer evaluation (Traditional German speaker response)
  async function handleCheckAnswer(question: Question) {
    if (question.isEvaluating) {
      handleCancelQuestionCheck(question);
      return;
    }

    if (!question.userDraftAnswer || !question.userDraftAnswer.trim()) {
      return;
    }

    if (!isApiKeyVerified || !apiKey.trim()) {
      showApiKeyModal = true;
      return;
    }

    const controller = new AbortController();
    questionAbortControllers[question.id] = controller;

    question.isEvaluating = true;
    question.streamingFeedback = '';
    question.lastEvaluation = null;
    pageErrorMessage = null;
    session = { ...session };

    try {
      const storyContext = `Titel: ${currentChapter.titleGerman}\n\n${currentChapter.storyGerman}`;
      const evalResult = await evaluateQuestionAnswerStream(
        getOpenRouterConfig(),
        storyContext,
        question,
        question.userDraftAnswer,
        'C1',
        (accumulated) => {
          if (!controller.signal.aborted) {
            question.streamingFeedback = accumulated;
            session = { ...session };
          }
        },
        controller.signal
      );

      if (!controller.signal.aborted) {
        question.lastEvaluation = evalResult;
        question.streamingFeedback = '';
        persistSession();
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        return; // Cancelled cleanly
      }
      console.error(err);
      pageErrorMessage = err.message || 'Fehler bei der Antwortprüfung.';
    } finally {
      delete questionAbortControllers[question.id];
      question.isEvaluating = false;
      session = { ...session };
    }
  }

  // Cancel an in-progress question answer check
  function handleCancelQuestionCheck(question: Question) {
    const controller = questionAbortControllers[question.id];
    if (controller) {
      controller.abort();
      delete questionAbortControllers[question.id];
    }
    question.isEvaluating = false;
    question.streamingFeedback = '';
    session = { ...session };
  }

  // Apply a traditional German reformulation to a question answer field
  function applyReformulation(question: Question, reformulation: string) {
    if (!reformulation) return;
    question.userDraftAnswer = reformulation;
    session = { ...session };
    persistSession();
  }

  // Handle streaming evaluation of user's continuation (Traditional German response)
  async function handleCheckContinuation() {
    if (isEvaluatingContinuation) {
      handleCancelContinuationCheck();
      return;
    }

    if (!currentChapterItem.userContinuation || !currentChapterItem.userContinuation.trim()) {
      return;
    }

    if (!isApiKeyVerified || !apiKey.trim()) {
      showApiKeyModal = true;
      return;
    }

    const controller = new AbortController();
    continuationAbortController = controller;

    isEvaluatingContinuation = true;
    currentChapterItem.isEvaluatingContinuation = true;
    currentChapterItem.streamingContinuationFeedback = '';
    currentChapterItem.continuationEvaluation = null;
    pageErrorMessage = null;
    session = { ...session };

    try {
      const storyContext = session.chapters
        .slice(0, activeChapterIndex + 1)
        .map(ch => `${ch.chapter.titleGerman}\n${ch.chapter.storyGerman}\n\n[Fortsetzung: ${ch.userContinuation || ''}]`)
        .join('\n\n---\n\n');

      const continuationEval = await evaluateContinuationStream(
        getOpenRouterConfig(),
        storyContext,
        currentChapterItem.userContinuation,
        'C1',
        (accumulated) => {
          if (!controller.signal.aborted) {
            currentChapterItem.streamingContinuationFeedback = accumulated;
            session = { ...session };
          }
        },
        controller.signal
      );

      if (!controller.signal.aborted) {
        currentChapterItem.continuationEvaluation = continuationEval;
        currentChapterItem.streamingContinuationFeedback = '';
        persistSession();
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        return; // Cancelled cleanly
      }
      console.error(err);
      pageErrorMessage = err.message || 'Fehler bei der Prüfung der Fortsetzung.';
    } finally {
      continuationAbortController = null;
      isEvaluatingContinuation = false;
      currentChapterItem.isEvaluatingContinuation = false;
      session = { ...session };
    }
  }

  // Cancel an in-progress continuation check
  function handleCancelContinuationCheck() {
    if (continuationAbortController) {
      continuationAbortController.abort();
      continuationAbortController = null;
    }
    isEvaluatingContinuation = false;
    currentChapterItem.isEvaluatingContinuation = false;
    currentChapterItem.streamingContinuationFeedback = '';
    session = { ...session };
  }

  // Apply reformulation to continuation textarea
  function applyContinuationReformulation(reformulation: string) {
    if (!reformulation) return;
    currentChapterItem.userContinuation = reformulation;
    session = { ...session };
    persistSession();
  }

  // Handle continuing the story with Gemini with streaming & cancellation
  async function handleContinueStoryWithAI() {
    if (isContinuingStory) {
      handleCancelStoryContinuation();
      return;
    }

    if (!currentChapterItem.userContinuation || !currentChapterItem.userContinuation.trim()) {
      pageErrorMessage = 'Bitte schreibe zuerst einen kurzen Abschnitt zur Fortsetzung der Handlung!';
      return;
    }

    if (!isApiKeyVerified || !apiKey.trim()) {
      showApiKeyModal = true;
      return;
    }

    const controller = new AbortController();
    storyContinuationAbortController = controller;

    isContinuingStory = true;
    streamingNextChapterText = '';
    pageErrorMessage = null;

    try {
      const storyHistoryText = session.chapters
        .map((ch) => `${ch.chapter.titleGerman}\n${ch.chapter.storyGerman}\n[Fortsetzung: ${ch.userContinuation}]`)
        .join('\n\n');

      const nextChapterNum = session.chapters.length + 1;

      const nextChapter = await continueStoryWithAIStream(
        getOpenRouterConfig(),
        storyHistoryText,
        currentChapterItem.userContinuation,
        nextChapterNum,
        'C1',
        (accumulated) => {
          if (!controller.signal.aborted) {
            streamingNextChapterText = accumulated;
          }
        },
        controller.signal
      );

      if (!controller.signal.aborted) {
        session.chapters.push({
          chapter: nextChapter,
          userContinuation: '',
          continuationEvaluation: null
        });

        activeChapterIndex = session.chapters.length - 1;
        streamingNextChapterText = '';
        persistSession();
        session = { ...session };
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        return; // Cancelled cleanly
      }
      console.error(err);
      pageErrorMessage = err.message || 'Fehler beim Generieren des nächsten Abschnitts.';
    } finally {
      storyContinuationAbortController = null;
      isContinuingStory = false;
      streamingNextChapterText = '';
    }
  }

  // Cancel next chapter story generation
  function handleCancelStoryContinuation() {
    if (storyContinuationAbortController) {
      storyContinuationAbortController.abort();
      storyContinuationAbortController = null;
    }
    isContinuingStory = false;
    streamingNextChapterText = '';
  }

  async function handleSaveAndVerifyApiKey() {
    modalErrorMessage = null;
    if (!inputApiKey.trim()) {
      modalErrorMessage = 'Bitte gib einen OpenRouter API-Schlüssel ein.';
      return;
    }

    isVerifyingKey = true;
    const res = await verifyApiKey(inputApiKey.trim());
    isVerifyingKey = false;

    if (res.valid) {
      apiKey = inputApiKey.trim();
      localStorage.setItem(STORAGE_KEY_API_KEY, apiKey);
      isApiKeyVerified = true;
      showApiKeyModal = false;
      pageErrorMessage = null;

      // Auto-load article from URL or pre-assigned article
      if (currentArticleNum) {
        handleLoadNewsArticle(currentArticleNum, currentSeed ?? undefined, selectedModel);
      }
    } else {
      modalErrorMessage = res.error || 'Ungültiger API-Schlüssel. Bitte überprüfe deine Eingabe.';
    }
  }

  function handleClearApiKey() {
    apiKey = '';
    inputApiKey = '';
    isApiKeyVerified = false;
    localStorage.removeItem(STORAGE_KEY_API_KEY);
    showApiKeyModal = false;
  }
</script>

<svelte:head>
  <title>German Learning Helper | river.berlin</title>
</svelte:head>

<div class="max-w-7xl mx-auto space-y-8 py-6 px-3 sm:px-6 lg:px-8 font-sans text-slate-900 dark:text-slate-100">
  <!-- Header with Translucent White Background (Border removed) -->
  <header class="rounded-2xl bg-white/80 dark:bg-slate-900/70 backdrop-blur-md text-slate-900 dark:text-slate-100 p-5 sm:p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
    <div class="flex items-center gap-3 flex-wrap">
      <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">
        German Learning Helper
      </h1>
    </div>

    <!-- Header Controls -->
    <div class="flex items-center gap-2.5 flex-wrap">
      <!-- Flashcards / Lernliste Button -->
      {#if isApiKeyVerified}
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-xs font-bold border border-amber-200 dark:border-amber-800 transition-all active:scale-95 cursor-pointer"
          on:click={() => showFlashcardsModal = true}
          title="Gemerkte Vokabeln & Flashcards anzeigen"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 fill-amber-500 text-amber-500" viewBox="0 0 24 24">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
          </svg>
          <span>Lernliste ({$flashcards.length})</span>
        </button>
      {/if}

      <!-- Artikel suchen & auswählen Button -->
      {#if isApiKeyVerified}
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 transition-all active:scale-95 cursor-pointer"
          on:click={handleOpenArticleSearch}
          title="Zeitungsartikel nach Titel oder Ressort suchen"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <span>Artikel suchen</span>
        </button>
      {/if}

      <!-- Neuer Zeitungsartikel Button with Hover-to-Cancel -->
      {#if isApiKeyVerified}
        <button
          type="button"
          class="group inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer {isLoadingDataset || isStreamingQuestions
            ? 'bg-slate-800 text-white hover:bg-rose-600 hover:border-rose-600 dark:bg-slate-700 dark:hover:bg-rose-600 border border-slate-700' 
            : 'bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-600 shadow-sm'}"
          on:click={() => handleLoadNewsArticle()}
          title={(isLoadingDataset || isStreamingQuestions) ? 'Klicken zum Abbrechen' : 'Neuen Zeitungsartikel aus 10kGNAD laden'}
        >
          {#if isLoadingDataset || isStreamingQuestions}
            <span class="group-hover:hidden flex items-center gap-1.5">
              <svg class="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{isLoadingDataset ? 'Lade Datensatz...' : 'Fragen laden...'}</span>
            </span>
            <span class="hidden group-hover:flex items-center gap-1.5 font-bold">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Abbrechen</span>
            </span>
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
            </svg>
            <span>Neuer Zeitungsartikel</span>
          {/if}
        </button>
      {/if}

      <!-- Share / Link kopieren Button -->
      {#if currentArticleNum}
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-300 dark:border-slate-700 transition-all active:scale-95 cursor-pointer"
          on:click={handleCopyShareLink}
          title="Teilbaren Link (Artikel #{currentArticleNum}, Model & Seed) kopieren"
        >
          {#if copiedLink}
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <span class="text-emerald-600 dark:text-emerald-400">Kopiert!</span>
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            <span>Teilen</span>
          {/if}
        </button>
      {/if}

      <!-- API Key Button -->
      <button
        type="button"
        class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-semibold border border-slate-300 dark:border-slate-700 transition-all cursor-pointer"
        on:click={() => { inputApiKey = apiKey; modalErrorMessage = null; showApiKeyModal = true; }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
        </svg>
        <span>{isApiKeyVerified ? 'API-Schlüssel' : 'API-Schlüssel eingeben'}</span>
      </button>
    </div>
  </header>

  <!-- Curly / Wavy Divider below Header -->
  <div class="w-full flex items-center justify-center -my-2 overflow-hidden py-1 select-none" aria-hidden="true">
    <svg class="w-full h-4 text-indigo-400/80 dark:text-indigo-400/70" viewBox="0 0 1200 24" fill="none" preserveAspectRatio="none">
      <defs>
        <linearGradient id="curlyHeaderDivider" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="currentColor" stop-opacity="0.05" />
          <stop offset="15%" stop-color="currentColor" stop-opacity="0.5" />
          <stop offset="50%" stop-color="currentColor" stop-opacity="0.85" />
          <stop offset="85%" stop-color="currentColor" stop-opacity="0.5" />
          <stop offset="100%" stop-color="currentColor" stop-opacity="0.05" />
        </linearGradient>
      </defs>
      <path
        d="M0,12 Q 25,2 50,12 T 100,12 T 150,12 T 200,12 T 250,12 T 300,12 T 350,12 T 400,12 T 450,12 T 500,12 T 550,12 T 600,12 T 650,12 T 700,12 T 750,12 T 800,12 T 850,12 T 900,12 T 950,12 T 1000,12 T 1050,12 T 1100,12 T 1150,12 T 1200,12"
        stroke="url(#curlyHeaderDivider)"
        stroke-width="2.5"
        stroke-linecap="round"
      />
    </svg>
  </div>

  <!-- Error / Alert Banner -->
  {#if pageErrorMessage}
    <div class="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs sm:text-sm flex items-start justify-between gap-3 shadow-xs">
      <div class="flex items-start gap-2">
        <span>⚠️</span>
        <p>{pageErrorMessage}</p>
      </div>
      <button 
        type="button" 
        class="text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 text-base leading-none cursor-pointer"
        on:click={() => pageErrorMessage = null}
        aria-label="Schließen"
      >
        ×
      </button>
    </div>
  {/if}

  <!-- First-time Dataset Download Progress indicator -->
  {#if isLoadingDataset && hfDatasetStatus}
    <div class="p-6 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 space-y-3 animate-in fade-in">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2.5 font-bold text-indigo-800 dark:text-indigo-300 text-sm">
          <svg class="animate-spin h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Hugging Face Hub (10kGNAD) Download</span>
        </div>
        <button
          type="button"
          class="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
          on:click={handleCancelArticleGeneration}
        >
          Abbrechen ✕
        </button>
      </div>
      <p class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono">
        {hfDatasetStatus}
      </p>
    </div>
  {/if}

  <!-- ONLY SHOW ELEMENTS BELOW ONCE API KEY IS VERIFIED -->
  {#if isApiKeyVerified}
    <div bind:this={contentContainer} class="relative">
      <!-- Floating Selection Translator Popover with Flashcard Bookmark feature (works for article AND questions) -->
      <SelectionTranslator {apiKey} targetContainer={contentContainer} />

      <div
        bind:this={splitterContainerRef}
        class="resizable-columns-grid grid grid-cols-1 items-start gap-y-8 {isDraggingSplitter ? 'select-none' : ''}"
        style="--desktop-cols: minmax(320px, {splitPercent}%) 24px minmax(280px, 1fr);"
      >
        <!-- 1. The News Article (Left Side, Row 1) -->
        <div class="lg:col-start-1 lg:row-start-1 order-1 space-y-8 lg:pr-3 min-w-0">
          <article class="space-y-4 py-2 relative">
            <div class="flex items-center justify-between gap-3 border-b border-slate-200/60 dark:border-slate-800 pb-3">
              <div class="space-y-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                    {currentChapter.titleGerman}
                  </h2>
                  {#if currentChapter.genre}
                    <span class="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      {currentChapter.genre}
                    </span>
                  {/if}
                  {#if currentArticleNum}
                    <button
                      type="button"
                      class="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer flex items-center gap-1"
                      on:click={handleOpenArticleSearch}
                      title="Anderen Artikel suchen & auswählen"
                    >
                      <span>Artikel #{currentArticleNum}</span>
                      <span class="text-[10px] opacity-75">🔍</span>
                    </button>
                  {/if}
                  {#if currentSeed !== null}
                    <span class="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700" title="Zufallssamen für deterministische Generierung">
                      Seed: {currentSeed}
                    </span>
                  {/if}
                </div>
              </div>
              <AudioReader text={currentChapter.storyGerman} apiKey={apiKey} label="Vorlesen" />
            </div>

            <!-- Article Text (Clean typography directly on background) -->
            <div class="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 text-base sm:text-lg leading-relaxed space-y-4 font-sans select-text">
              {#each currentChapter.storyGerman.split('\n\n') as paragraph}
                {#if paragraph.trim()}
                  <p class="leading-relaxed">{paragraph.trim()}</p>
                {/if}
              {/each}
            </div>
          </article>
        </div>

        <!-- Draggable Resizer Divider between Text and Questions (Adjustable Splitter) -->
        <div
          class="hidden lg:flex lg:col-start-2 lg:row-start-1 lg:row-span-2 h-full flex-col items-center justify-center relative cursor-col-resize select-none group touch-none py-2 px-1 z-10"
          on:pointerdown={handleSplitterPointerDown}
          on:pointermove={handleSplitterPointerMove}
          on:pointerup={handleSplitterPointerUp}
          on:pointercancel={handleSplitterPointerUp}
          title="Trennlinie verschieben: Ziehen, um Spaltenbreite einzustellen (Doppelklick für Standard 58%)"
          on:dblclick={() => { splitPercent = 58; if (typeof localStorage !== 'undefined') localStorage.setItem('german_helper_split_percent', '58'); }}
        >
          <!-- Subtle vertical track line -->
          <div class="w-1 h-full rounded-full transition-colors duration-150 {isDraggingSplitter ? 'bg-indigo-500 shadow-sm' : 'bg-slate-200/90 hover:bg-indigo-400 dark:bg-slate-800 dark:hover:bg-indigo-500'}"></div>
          
          <!-- Sticky Drag Handle Pill (stays vertically centered in view while scrolling) -->
          <div class="sticky top-1/2 -translate-y-1/2 w-6 h-12 rounded-full border transition-all duration-150 flex items-center justify-center shadow-xs {isDraggingSplitter ? 'bg-indigo-600 border-indigo-600 text-white scale-110 shadow-md ring-4 ring-indigo-500/20' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-400 group-hover:scale-105'}">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm8-10a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
            </svg>
          </div>
        </div>

        <!-- 2. Questions Section (Right Side, Spanning Rows 1 & 2, Sticky on Large Screens) -->
        <div class="lg:col-start-3 lg:row-start-1 lg:row-span-2 order-2 space-y-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pl-3 lg:pr-1 min-w-0">
          <section class="space-y-5">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Fragen zum Text
                </h3>
                {#if isQuestionsFromCache}
                  <span class="text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded-md" title="Aus Rolling-Cache geladen (gespeichert für die letzten 10 Artikel)">
                    Aus Cache
                  </span>
                {/if}
              </div>

              {#if isStreamingQuestions}
                <div class="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 animate-pulse">
                  <svg class="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Fragen werden formuliert...</span>
                </div>
              {/if}
            </div>

            <!-- Live Streaming Questions Preview -->
            {#if isStreamingQuestions && streamingQuestionsText}
              <div class="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 space-y-3 animate-in fade-in">
                <div class="flex items-center justify-between gap-2 border-b border-indigo-200/80 dark:border-indigo-800/80 pb-2">
                  <div class="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-300 text-xs sm:text-sm">
                    <span class="inline-block w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
                    <span>Verständnisfragen werden erstellt...</span>
                  </div>
                  <button
                    type="button"
                    class="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
                    on:click={handleCancelArticleGeneration}
                  >
                    Abbrechen ✕
                  </button>
                </div>
                <div class="markdown-content font-sans text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-200">
                  {@html renderMarkdown(streamingQuestionsText)}
                  <span class="inline-block w-2 h-4 ml-0.5 bg-indigo-500 animate-pulse align-middle"></span>
                </div>
              </div>
            {/if}

            <!-- Interactive Question Cards -->
            {#if currentChapter.questions && currentChapter.questions.length > 0}
              <div class="space-y-5">
                {#each currentChapter.questions as q, qIdx (q.id)}
                  <div class="p-5 sm:p-6 rounded-2xl bg-white/75 dark:bg-slate-900/60 backdrop-blur-md shadow-xs space-y-3.5">
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex items-start gap-2.5">
                        <span class="flex items-center justify-center w-5 h-5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold shrink-0 mt-0.5">
                          {qIdx + 1}
                        </span>
                        <h4 class="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-snug select-text">
                          {q.questionGerman}
                        </h4>
                      </div>
                    </div>

                    <!-- User answer input -->
                    <textarea
                      bind:value={q.userDraftAnswer}
                      placeholder="Antwort auf Deutsch formulieren..."
                      rows="2"
                      class="w-full p-3.5 rounded-xl bg-white/90 dark:bg-slate-800/80 border-0 shadow-2xs text-slate-900 dark:text-slate-100 text-sm leading-relaxed placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    ></textarea>

                    <div class="flex items-center justify-end">
                      <!-- Prüfe Antwort Button with Hover-to-Cancel -->
                      <button
                        type="button"
                        class="group px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer {q.isEvaluating 
                          ? 'bg-slate-800 text-white hover:bg-rose-600 hover:text-white dark:bg-slate-700 dark:hover:bg-rose-600 shadow-xs' 
                          : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white disabled:opacity-50 disabled:cursor-not-allowed'}"
                        on:click={() => handleCheckAnswer(q)}
                        disabled={!q.isEvaluating && !q.userDraftAnswer.trim()}
                        title={q.isEvaluating ? 'Klicken zum Abbrechen' : 'Antwort überprüfen & Grammatik korrigieren'}
                      >
                        {#if q.isEvaluating}
                          <span class="group-hover:hidden flex items-center gap-1.5">
                            <svg class="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Prüfe Antwort...</span>
                          </span>
                          <span class="hidden group-hover:flex items-center gap-1.5 font-bold">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span>Abbrechen</span>
                          </span>
                        {:else}
                          <span>{q.lastEvaluation ? 'Erneut prüfen' : 'Antwort prüfen'}</span>
                        {/if}
                      </button>
                    </div>

                    <!-- Live Streaming feedback box while evaluating (Markdown supported) -->
                    {#if q.isEvaluating && q.streamingFeedback}
                      <div class="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 space-y-2 text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                        <div class="flex items-center justify-between gap-2">
                          <div class="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-300">
                            <span class="inline-block w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                            <span>Rückmeldung wird erstellt...</span>
                          </div>
                          <button
                            type="button"
                            class="text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
                            on:click={() => handleCancelQuestionCheck(q)}
                          >
                            Abbrechen ✕
                          </button>
                        </div>
                        <div class="markdown-content font-sans font-normal leading-relaxed text-slate-800 dark:text-slate-200">
                          {@html renderMarkdown(q.streamingFeedback)}
                          <span class="inline-block w-1.5 h-3.5 ml-0.5 bg-indigo-500 animate-pulse align-middle"></span>
                        </div>
                      </div>
                    {/if}

                    <!-- Completed Evaluation Output (Full Markdown support & Traditional German Speaker responses) -->
                    {#if q.lastEvaluation && !q.isEvaluating}
                      {@const evalRes = q.lastEvaluation}
                      <div class="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        
                        <!-- 1. Content Feedback (Inhaltliche Rückmeldung) -->
                        {#if evalRes.contentFeedback}
                          <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-slate-200 space-y-2">
                            <div class="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>📝</span>
                              <span>Inhaltliche Rückmeldung</span>
                            </div>
                            <div class="markdown-content leading-relaxed text-slate-800 dark:text-slate-200">
                              {@html renderMarkdown(evalRes.contentFeedback)}
                            </div>
                          </div>
                        {:else if !evalRes.errorItems?.length && !evalRes.errorChecklistText && evalRes.feedbackText}
                          <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-slate-200 space-y-2">
                            <div class="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>📝</span>
                              <span>Grammatik-Korrektur & Rückmeldung</span>
                            </div>
                            <div class="markdown-content leading-relaxed text-slate-800 dark:text-slate-200">
                              {@html renderMarkdown(evalRes.feedbackText)}
                            </div>
                          </div>
                        {/if}

                        <!-- 2. Numbered HTML Error Checklist / 0-Errors Badge -->
                        {#if evalRes.errorCount === 0}
                          <div class="p-3.5 sm:p-4 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-start gap-3">
                            <div class="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 text-base font-bold">
                              ✓
                            </div>
                            <div class="space-y-0.5">
                              <div class="flex items-center gap-2">
                                <span class="text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200">0 Fehler gefunden</span>
                                <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200">Fehlerfrei</span>
                              </div>
                              <p class="text-xs text-emerald-800/90 dark:text-emerald-300/90">
                                Hervorragend! Deine Antwort enthält keinerlei grammatikalische oder sprachliche Fehler.
                              </p>
                            </div>
                          </div>
                        {:else if evalRes.errorItems && evalRes.errorItems.length > 0}
                          <div class="p-4 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-3">
                            <div class="flex items-center justify-between gap-2 flex-wrap border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
                              <div class="flex items-center gap-2">
                                <span class="text-base">📋</span>
                                <span class="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">Fehler-Checkliste</span>
                                <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60">
                                  {evalRes.errorCount ?? evalRes.errorItems.length} {(evalRes.errorCount ?? evalRes.errorItems.length) === 1 ? 'Fehler gefunden' : 'Fehler gefunden'}
                                </span>
                              </div>
                              <span class="text-[11px] text-slate-500 dark:text-slate-400">
                                Klicke auf das Kästchen, wenn du den Fehler verstanden hast
                              </span>
                            </div>

                            <ol class="space-y-2 pt-1 list-none p-0 m-0">
                              {#each evalRes.errorItems as item, idx}
                                <li class="flex items-start gap-3 p-3 rounded-lg border transition-all select-none {item.checked ? 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-800/60 opacity-60' : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-900/40'}">
                                  <label class="flex items-start gap-3 cursor-pointer w-full">
                                    <input
                                      type="checkbox"
                                      bind:checked={item.checked}
                                      class="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                                    />
                                    <div class="flex-1 min-w-0 space-y-1">
                                      <div class="flex items-center gap-2">
                                        <span class="text-[11px] font-bold px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-800 dark:text-slate-200 shrink-0">
                                          #{item.num || idx + 1}
                                        </span>
                                      </div>
                                      <div class="markdown-content text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 {item.checked ? 'line-through text-slate-500 dark:text-slate-400' : ''}">
                                        {@html renderMarkdown(item.text)}
                                      </div>
                                    </div>
                                  </label>
                                </li>
                              {/each}
                            </ol>
                          </div>
                        {:else if evalRes.errorChecklistText}
                          <div class="p-4 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-2">
                            <div class="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-xs sm:text-sm">
                              <span>📋</span>
                              <span>Fehler-Checkliste</span>
                              {#if evalRes.errorCount !== undefined}
                                <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300">
                                  {evalRes.errorCount} {evalRes.errorCount === 1 ? 'Fehler' : 'Fehler'}
                                </span>
                              {/if}
                            </div>
                            <div class="markdown-content text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                              {@html renderMarkdown(evalRes.errorChecklistText)}
                            </div>
                          </div>
                        {/if}

                        <!-- 2. Traditional German Speaker Reformulation -->
                        {#if evalRes.betterReformulation}
                          <div class="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 text-xs sm:text-sm text-slate-800 dark:text-slate-200 space-y-2">
                            <div class="flex items-center justify-between gap-2 flex-wrap">
                              <div class="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                <span>✨</span>
                                <span>Wie ein traditioneller deutscher Muttersprachler antworten würde</span>
                              </div>
                              <button
                                type="button"
                                class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
                                on:click={() => applyReformulation(q, evalRes.betterReformulation || '')}
                                title="Diesen Text in dein Antwortfeld übernehmen"
                              >
                                In Textfeld übernehmen
                              </button>
                            </div>
                            <div class="markdown-content italic text-slate-800 dark:text-slate-100 leading-relaxed bg-white/80 dark:bg-slate-900/70 p-3.5 rounded-lg border border-emerald-200/60 dark:border-emerald-800/50">
                              {@html renderMarkdown(evalRes.betterReformulation)}
                            </div>
                          </div>
                        {/if}

                        <!-- 3. Sample Answer (Musterantwort - Hidden by default, revealable on click) -->
                        {#if evalRes.sampleAnswer}
                          <details class="group rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 overflow-hidden text-xs sm:text-sm">
                            <summary class="cursor-pointer font-bold text-slate-700 dark:text-slate-300 p-3.5 flex items-center justify-between hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors select-none">
                              <span class="flex items-center gap-1.5">
                                <span>💡</span>
                                <span>Musterantwort anzeigen</span>
                              </span>
                              <span class="text-xs text-indigo-600 dark:text-indigo-400 group-open:rotate-180 transition-transform">
                                ▼
                              </span>
                            </summary>
                            <div class="p-4 pt-2 markdown-content text-slate-800 dark:text-slate-200 leading-relaxed border-t border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-900">
                              {@html renderMarkdown(evalRes.sampleAnswer)}
                            </div>
                          </details>
                        {/if}

                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          </section>
        </div>

        <!-- 3. Collaborative Continuation / Reaction (Left Side, Row 2, below Article) -->
        <div class="lg:col-start-1 lg:row-start-2 order-3 space-y-8 lg:pr-3 min-w-0">
          <section class="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div class="space-y-1">
              <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Text weiterschreiben / Eigene Gedanken formulieren
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Formuliere einen eigenen Kommentar, eine Fortsetzung oder Analyse auf Deutsch.
              </p>
            </div>

            <textarea
              bind:value={currentChapterItem.userContinuation}
              placeholder="Schreibe hier deine Fortsetzung oder Gedanken zum Text..."
              rows="3"
              class="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm leading-relaxed placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            ></textarea>

            <!-- First Action: Check Continuation with Hover-to-Cancel -->
            <div class="flex items-center justify-end">
              <button
                type="button"
                class="group px-4 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 cursor-pointer {isEvaluatingContinuation 
                  ? 'bg-slate-800 text-white hover:bg-rose-600 hover:border-rose-600 dark:bg-slate-700 dark:hover:bg-rose-600 border-slate-700' 
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed'}"
                on:click={handleCheckContinuation}
                disabled={!isEvaluatingContinuation && !currentChapterItem.userContinuation.trim()}
                title={isEvaluatingContinuation ? 'Klicken zum Abbrechen' : 'Fortsetzung überprüfen & Grammatik korrigieren'}
              >
                {#if isEvaluatingContinuation}
                  <span class="group-hover:hidden flex items-center gap-1.5">
                    <svg class="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Prüfe Fortsetzung...</span>
                  </span>
                  <span class="hidden group-hover:flex items-center gap-1.5 font-bold">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Abbrechen</span>
                  </span>
                {:else}
                  <span>Fortsetzung überprüfen</span>
                {/if}
              </button>
            </div>

            <!-- Streaming feedback box for continuation (Markdown supported) -->
            {#if isEvaluatingContinuation && currentChapterItem.streamingContinuationFeedback}
              <div class="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 space-y-2 text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-300">
                    <span class="inline-block w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                    <span>Rückmeldung zur Fortsetzung wird erstellt...</span>
                  </div>
                  <button
                    type="button"
                    class="text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
                    on:click={handleCancelContinuationCheck}
                  >
                    Abbrechen ✕
                  </button>
                </div>
                <div class="markdown-content font-sans font-normal leading-relaxed text-slate-800 dark:text-slate-200">
                  {@html renderMarkdown(currentChapterItem.streamingContinuationFeedback)}
                  <span class="inline-block w-1.5 h-3.5 ml-0.5 bg-indigo-500 animate-pulse align-middle"></span>
                </div>
              </div>
            {/if}

            <!-- Continuation Feedback Display if checked (Markdown supported) -->
            {#if currentChapterItem.continuationEvaluation && !isEvaluatingContinuation}
              {@const cEval = currentChapterItem.continuationEvaluation}
              <div class="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                
                <!-- 1. Content Feedback -->
                {#if cEval.contentFeedback}
                  <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-slate-200 space-y-2">
                    <div class="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>📝</span>
                      <span>Inhaltliche Rückmeldung & Stil</span>
                    </div>
                    <div class="markdown-content leading-relaxed text-slate-800 dark:text-slate-200">
                      {@html renderMarkdown(cEval.contentFeedback)}
                    </div>
                  </div>
                {:else if !cEval.errorItems?.length && !cEval.errorChecklistText && cEval.feedbackText}
                  <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-slate-200 space-y-2">
                    <div class="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>📝</span>
                      <span>Grammatik-Korrektur & Stil-Rückmeldung</span>
                    </div>
                    <div class="markdown-content leading-relaxed text-slate-800 dark:text-slate-200">
                      {@html renderMarkdown(cEval.feedbackText)}
                    </div>
                  </div>
                {/if}

                <!-- 2. Numbered HTML Error Checklist / 0-Errors Badge -->
                {#if cEval.errorCount === 0}
                  <div class="p-3.5 sm:p-4 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-start gap-3">
                    <div class="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 text-base font-bold">
                      ✓
                    </div>
                    <div class="space-y-0.5">
                      <div class="flex items-center gap-2">
                        <span class="text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200">0 Fehler gefunden</span>
                        <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200">Fehlerfrei</span>
                      </div>
                      <p class="text-xs text-emerald-800/90 dark:text-emerald-300/90">
                        Hervorragend! Dein Text ist vollkommen fehlerfrei verfasst.
                      </p>
                    </div>
                  </div>
                {:else if cEval.errorItems && cEval.errorItems.length > 0}
                  <div class="p-4 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-3">
                    <div class="flex items-center justify-between gap-2 flex-wrap border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
                      <div class="flex items-center gap-2">
                        <span class="text-base">📋</span>
                        <span class="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">Fehler-Checkliste</span>
                        <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60">
                          {cEval.errorCount ?? cEval.errorItems.length} {(cEval.errorCount ?? cEval.errorItems.length) === 1 ? 'Fehler gefunden' : 'Fehler gefunden'}
                        </span>
                      </div>
                      <span class="text-[11px] text-slate-500 dark:text-slate-400">
                        Klicke auf das Kästchen, wenn du den Fehler verstanden hast
                      </span>
                    </div>

                    <ol class="space-y-2 pt-1 list-none p-0 m-0">
                      {#each cEval.errorItems as item, idx}
                        <li class="flex items-start gap-3 p-3 rounded-lg border transition-all select-none {item.checked ? 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-800/60 opacity-60' : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-900/40'}">
                          <label class="flex items-start gap-3 cursor-pointer w-full">
                            <input
                              type="checkbox"
                              bind:checked={item.checked}
                              class="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                            />
                            <div class="flex-1 min-w-0 space-y-1">
                              <div class="flex items-center gap-2">
                                <span class="text-[11px] font-bold px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-800 dark:text-slate-200 shrink-0">
                                  #{item.num || idx + 1}
                                </span>
                              </div>
                              <div class="markdown-content text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 {item.checked ? 'line-through text-slate-500 dark:text-slate-400' : ''}">
                                {@html renderMarkdown(item.text)}
                              </div>
                            </div>
                          </label>
                        </li>
                      {/each}
                    </ol>
                  </div>
                {:else if cEval.errorChecklistText}
                  <div class="p-4 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-2">
                    <div class="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-xs sm:text-sm">
                      <span>📋</span>
                      <span>Fehler-Checkliste</span>
                      {#if cEval.errorCount !== undefined}
                        <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300">
                          {cEval.errorCount} {cEval.errorCount === 1 ? 'Fehler' : 'Fehler'}
                        </span>
                      {/if}
                    </div>
                    <div class="markdown-content text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                      {@html renderMarkdown(cEval.errorChecklistText)}
                    </div>
                  </div>
                {/if}

                {#if cEval.betterReformulation}
                  <div class="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 text-xs sm:text-sm text-slate-800 dark:text-slate-200 space-y-2">
                    <div class="flex items-center justify-between gap-2 flex-wrap">
                      <div class="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <span>✨</span>
                        <span>Wie ein traditioneller deutscher Muttersprachler formulieren würde</span>
                      </div>
                      <button
                        type="button"
                        class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
                        on:click={() => applyContinuationReformulation(cEval.betterReformulation || '')}
                        title="Diesen Text in dein Fortsetzungsfeld übernehmen"
                      >
                        In Textfeld übernehmen
                      </button>
                    </div>
                    <div class="markdown-content italic text-slate-800 dark:text-slate-100 leading-relaxed bg-white/80 dark:bg-slate-900/70 p-3.5 rounded-lg border border-emerald-200/60 dark:border-emerald-800/50">
                      {@html renderMarkdown(cEval.betterReformulation)}
                    </div>
                  </div>
                {/if}

              </div>
            {/if}

            <!-- Live Streaming Preview for Next Chapter -->
            {#if isContinuingStory && streamingNextChapterText}
              <div class="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 space-y-3 animate-in fade-in">
                <div class="flex items-center justify-between gap-2 border-b border-indigo-200/80 dark:border-indigo-800/80 pb-2.5">
                  <div class="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-300 text-xs sm:text-sm">
                    <span class="inline-block w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
                    <span>Nächster Abschnitt wird von Gemini geschrieben...</span>
                  </div>
                  <button
                    type="button"
                    class="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
                    on:click={handleCancelStoryContinuation}
                  >
                    Abbrechen ✕
                  </button>
                </div>
                <div class="markdown-content font-sans text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-200">
                  {@html renderMarkdown(streamingNextChapterText)}
                  <span class="inline-block w-2 h-4 ml-0.5 bg-indigo-500 animate-pulse align-middle"></span>
                </div>
              </div>
            {/if}

            <!-- Bottom Button: Mit Gemini weiterschreiben with Hover-to-Cancel -->
            <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
              <button
                type="button"
                class="group px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm active:scale-95 flex items-center gap-2 cursor-pointer {isContinuingStory 
                  ? 'bg-slate-800 text-white hover:bg-rose-600 dark:bg-slate-700 dark:hover:bg-rose-600' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'}"
                on:click={handleContinueStoryWithAI}
                disabled={!isContinuingStory && !currentChapterItem.userContinuation.trim()}
                title={isContinuingStory ? 'Klicken zum Abbrechen' : 'Mit Gemini weiterschreiben'}
              >
                {#if isContinuingStory}
                  <span class="group-hover:hidden flex items-center gap-2">
                    <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Gemini schreibt weiter...</span>
                  </span>
                  <span class="hidden group-hover:flex items-center gap-1.5 font-bold">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Abbrechen</span>
                  </span>
                {:else}
                  <span>Mit Gemini weiterschreiben</span>
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                {/if}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  {/if}

  <!-- Article Search Modal -->
  <ArticleSearchModal 
    isOpen={showArticleSearchModal} 
    articles={loadedArticles || []} 
    currentArticleNum={currentArticleNum} 
    isLoading={isLoadingDataset} 
    onSelectArticle={handleSelectArticleFromSearch} 
    onClose={() => showArticleSearchModal = false} 
  />

  <!-- Flashcards / Lernliste Modal with Export Options -->
  <FlashcardsModal isOpen={showFlashcardsModal} onClose={() => showFlashcardsModal = false} />

  <!-- API Key Modal -->
  {#if showApiKeyModal}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div 
        class="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 animate-in zoom-in-95"
        role="dialog"
        aria-modal="true"
      >
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 class="text-base font-bold text-slate-900 dark:text-slate-100">
            OpenRouter API-Schlüssel
          </h3>
          <button 
            type="button" 
            class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl leading-none cursor-pointer"
            on:click={() => showApiKeyModal = false}
          >
            ×
          </button>
        </div>

        {#if modalErrorMessage}
          <div class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs">
            {modalErrorMessage}
          </div>
        {/if}

        <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Gib deinen OpenRouter API-Schlüssel ein. Sobald der Schlüssel verifiziert wurde, wird der Zeitungsartikel freigeschaltet.
        </p>

        <div class="space-y-1.5">
          <div class="relative">
            <input
              type={showApiKeyText ? 'text' : 'password'}
              bind:value={inputApiKey}
              placeholder="sk-or-v1-xxxxxxxxxxxxxxxx"
              class="w-full px-3.5 py-2.5 pr-12 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1.5 py-1 cursor-pointer"
              on:click={() => showApiKeyText = !showApiKeyText}
            >
              {showApiKeyText ? 'Verstecken' : 'Zeigen'}
            </button>
          </div>
        </div>

        <div class="flex items-center justify-between pt-2">
          {#if isApiKeyVerified}
            <button
              type="button"
              class="text-xs text-rose-600 hover:underline cursor-pointer"
              on:click={handleClearApiKey}
            >
              Schlüssel entfernen
            </button>
          {:else}
            <div></div>
          {/if}

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              on:click={() => showApiKeyModal = false}
            >
              Abbrechen
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              on:click={handleSaveAndVerifyApiKey}
              disabled={isVerifyingKey || !inputApiKey.trim()}
            >
              {#if isVerifyingKey}
                <svg class="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Verifiziere...</span>
              {:else}
                <span>Speichern & Prüfen</span>
              {/if}
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  :global(.markdown-content p) {
    margin-bottom: 0.5rem;
    line-height: 1.6;
  }
  :global(.markdown-content p:last-child) {
    margin-bottom: 0;
  }
  :global(.markdown-content ul) {
    list-style-type: disc;
    margin-left: 1.25rem;
    margin-bottom: 0.5rem;
  }
  :global(.markdown-content ol) {
    list-style-type: decimal;
    margin-left: 1.25rem;
    margin-bottom: 0.5rem;
  }
  :global(.markdown-content li) {
    margin-bottom: 0.25rem;
  }
  :global(.markdown-content strong) {
    font-weight: 700;
  }
  :global(.markdown-content em) {
    font-style: italic;
  }
  :global(.markdown-content code) {
    background-color: rgba(100, 116, 139, 0.15);
    padding: 0.15rem 0.35rem;
    border-radius: 0.375rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.85em;
  }
  :global(.markdown-content blockquote) {
    border-left: 3px solid rgba(99, 102, 241, 0.5);
    padding-left: 0.75rem;
    font-style: italic;
    margin: 0.5rem 0;
  }

  @media (min-width: 1024px) {
    .resizable-columns-grid {
      display: grid !important;
      grid-template-columns: var(--desktop-cols) !important;
    }
  }
</style>
