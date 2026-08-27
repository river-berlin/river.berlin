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
    generateNewStory, 
    evaluateQuestionAnswer, 
    evaluateContinuation, 
    continueStoryWithAI 
  } from './lib/openrouter';
  import AnnotationViewer from './lib/AnnotationViewer.svelte';
  import AudioReader from './lib/AudioReader.svelte';
  import SelectionTranslator from './lib/SelectionTranslator.svelte';

  // Persistence keys
  const STORAGE_KEY_API_KEY = 'german_helper_openrouter_key';
  const STORAGE_KEY_SESSION = 'german_helper_session_v4';

  // Configuration state
  let apiKey = '';
  let inputApiKey = '';
  let showApiKeyModal = false;
  let showApiKeyText = false;
  let isApiKeyVerified = false;
  let isVerifyingKey = false;
  let modalErrorMessage: string | null = null;

  // Application session state
  let session: StorySession = DEMO_STORY_SESSION;
  let activeChapterIndex = 0;

  // Active chapter
  $: currentChapterItem = session.chapters[activeChapterIndex] || session.chapters[0];
  $: currentChapter = currentChapterItem.chapter;

  // UI state
  let isGeneratingStory = false;
  let isContinuingStory = false;
  let isEvaluatingContinuation = false;
  let pageErrorMessage: string | null = null;
  let showVocabularyDrawer = false;
  let storyContainer: HTMLElement | null = null;

  onMount(async () => {
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
  });

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

  function persistSession() {
    session.updatedAt = Date.now();
    session.currentChapterIndex = activeChapterIndex;
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
  }

  function getOpenRouterConfig(): OpenRouterConfig {
    return {
      apiKey: apiKey.trim(),
      model: DEFAULT_MODEL,
      siteUrl: typeof window !== 'undefined' ? window.location.origin : 'https://river.berlin',
      siteName: 'river.berlin German Learning Helper'
    };
  }

  // Handle generating a brand new story
  async function handleCreateNewStory() {
    if (!isApiKeyVerified || !apiKey.trim()) {
      showApiKeyModal = true;
      return;
    }

    pageErrorMessage = null;
    isGeneratingStory = true;

    try {
      const newChapter = await generateNewStory(getOpenRouterConfig());

      session = {
        id: `session-${Date.now()}`,
        title: newChapter.titleGerman,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        difficulty: 'C1',
        genre: 'Literarisch & Philosophie',
        chapters: [
          {
            chapter: newChapter,
            userContinuation: '',
            continuationEvaluation: null
          }
        ],
        currentChapterIndex: 0
      };

      activeChapterIndex = 0;
      persistSession();
    } catch (err: any) {
      console.error(err);
      pageErrorMessage = err.message || 'Fehler beim Erstellen der Geschichte. Bitte prüfe deinen API-Schlüssel.';
    } finally {
      isGeneratingStory = false;
    }
  }

  // Handle submitting a question answer
  async function handleCheckAnswer(question: Question) {
    if (!question.userDraftAnswer || !question.userDraftAnswer.trim()) {
      return;
    }

    if (!isApiKeyVerified || !apiKey.trim()) {
      showApiKeyModal = true;
      return;
    }

    question.isEvaluating = true;
    pageErrorMessage = null;
    session = { ...session };

    try {
      const storyContext = `Titel: ${currentChapter.titleGerman}\n\n${currentChapter.storyGerman}`;
      const evalResult = await evaluateQuestionAnswer(
        getOpenRouterConfig(),
        storyContext,
        question,
        question.userDraftAnswer
      );

      question.lastEvaluation = evalResult;
      persistSession();
    } catch (err: any) {
      console.error(err);
      pageErrorMessage = err.message || 'Fehler bei der Antwortprüfung.';
    } finally {
      question.isEvaluating = false;
      session = { ...session };
    }
  }

  // Handle checking the user's continuation
  async function handleCheckContinuation() {
    if (!currentChapterItem.userContinuation || !currentChapterItem.userContinuation.trim()) {
      return;
    }

    if (!isApiKeyVerified || !apiKey.trim()) {
      showApiKeyModal = true;
      return;
    }

    isEvaluatingContinuation = true;
    pageErrorMessage = null;

    try {
      const storyContext = session.chapters
        .slice(0, activeChapterIndex + 1)
        .map(ch => `${ch.chapter.titleGerman}\n${ch.chapter.storyGerman}\n\n[Fortsetzung: ${ch.userContinuation || ''}]`)
        .join('\n\n---\n\n');

      const continuationEval = await evaluateContinuation(
        getOpenRouterConfig(),
        storyContext,
        currentChapterItem.userContinuation
      );

      currentChapterItem.continuationEvaluation = continuationEval;
      persistSession();
      session = { ...session };
    } catch (err: any) {
      console.error(err);
      pageErrorMessage = err.message || 'Fehler bei der Prüfung der Fortsetzung.';
    } finally {
      isEvaluatingContinuation = false;
    }
  }

  // Handle continuing the story with Gemini (writes next chapter)
  async function handleContinueStoryWithAI() {
    if (!currentChapterItem.userContinuation || !currentChapterItem.userContinuation.trim()) {
      pageErrorMessage = 'Bitte schreibe zuerst einen kurzen Abschnitt zur Fortsetzung der Handlung!';
      return;
    }

    if (!isApiKeyVerified || !apiKey.trim()) {
      showApiKeyModal = true;
      return;
    }

    isContinuingStory = true;
    pageErrorMessage = null;

    try {
      const storyHistoryText = session.chapters
        .map((ch) => `${ch.chapter.titleGerman}\n${ch.chapter.storyGerman}\n[Fortsetzung: ${ch.userContinuation}]`)
        .join('\n\n');

      const nextChapterNum = session.chapters.length + 1;

      const nextChapter = await continueStoryWithAI(
        getOpenRouterConfig(),
        storyHistoryText,
        currentChapterItem.userContinuation,
        nextChapterNum
      );

      session.chapters.push({
        chapter: nextChapter,
        userContinuation: '',
        continuationEvaluation: null
      });

      activeChapterIndex = session.chapters.length - 1;
      persistSession();
      session = { ...session };
    } catch (err: any) {
      console.error(err);
      pageErrorMessage = err.message || 'Fehler beim Generieren des nächsten Abschnitts.';
    } finally {
      isContinuingStory = false;
    }
  }
</script>

<svelte:head>
  <title>German Learning Helper | river.berlin</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-8 py-6 px-2 sm:px-4">
  <!-- Header with White Background -->
  <header class="rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-5 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
    <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">
      German Learning Helper
    </h1>

    <!-- Only API Key Button in Header -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-semibold border border-slate-300 dark:border-slate-700 transition-all"
        on:click={() => { inputApiKey = apiKey; modalErrorMessage = null; showApiKeyModal = true; }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
        </svg>
        <span>{isApiKeyVerified ? 'API-Schlüssel' : 'API-Schlüssel eingeben'}</span>
      </button>

      {#if isApiKeyVerified}
        <button
          type="button"
          class="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all disabled:opacity-50"
          on:click={handleCreateNewStory}
          disabled={isGeneratingStory}
          title="Neue Geschichte generieren"
        >
          {#if isGeneratingStory}
            <svg class="animate-spin h-4 w-4 text-slate-700 dark:text-slate-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          {/if}
        </button>
      {/if}
    </div>
  </header>

  <!-- Error / Alert Banner -->
  {#if pageErrorMessage}
    <div class="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs sm:text-sm flex items-start justify-between gap-3 shadow-xs">
      <div class="flex items-start gap-2">
        <span>⚠️</span>
        <p>{pageErrorMessage}</p>
      </div>
      <button 
        type="button" 
        class="text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 text-base leading-none"
        on:click={() => pageErrorMessage = null}
        aria-label="Schließen"
      >
        ×
      </button>
    </div>
  {/if}

  <!-- ONLY SHOW ELEMENTS BELOW ONCE API KEY IS VERIFIED -->
  {#if isApiKeyVerified}
    <!-- 1. The Story directly below header (NO borders, NO box shadows) -->
    <article bind:this={storyContainer} class="space-y-4 py-2 relative">
      <!-- Floating Selection Translator Popover -->
      <SelectionTranslator {apiKey} targetContainer={storyContainer} />

      <div class="flex items-center justify-between gap-3 border-b border-slate-200/60 dark:border-slate-800 pb-3">
        <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          {currentChapter.titleGerman}
        </h2>
        <AudioReader text={currentChapter.storyGerman} apiKey={apiKey} label="Vorlesen" />
      </div>

      <!-- Story Text (Clean typography directly on background) -->
      <div class="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 text-base sm:text-lg leading-relaxed space-y-4 font-sans select-text">
        {#each currentChapter.storyGerman.split('\n\n') as paragraph}
          {#if paragraph.trim()}
            <p class="leading-relaxed">{paragraph.trim()}</p>
          {/if}
        {/each}
      </div>

      <!-- Vocabulary Toggle (German only) -->
      {#if currentChapter.vocabulary && currentChapter.vocabulary.length > 0}
        <div class="pt-2">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border {showVocabularyDrawer ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}"
            on:click={() => showVocabularyDrawer = !showVocabularyDrawer}
          >
            <span>Wortschatz ({currentChapter.vocabulary.length})</span>
          </button>

          <!-- Vocabulary Drawer (German definitions) -->
          {#if showVocabularyDrawer}
            <div class="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
              {#each currentChapter.vocabulary as voc}
                <div class="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                  <div class="flex items-baseline justify-between gap-2">
                    <span class="font-bold text-slate-900 dark:text-slate-100 text-sm">{voc.german}</span>
                    {#if voc.partOfSpeech}
                      <span class="text-slate-400 text-[11px] italic">{voc.partOfSpeech}</span>
                    {/if}
                  </div>
                  {#if voc.definitionGerman}
                    <p class="text-slate-700 dark:text-slate-300">{voc.definitionGerman}</p>
                  {/if}
                  {#if voc.exampleSentence}
                    <p class="text-slate-500 dark:text-slate-400 text-[11px] italic">»{voc.exampleSentence}«</p>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </article>

    <!-- 2. The Questions directly below the story -->
    <section class="space-y-5 pt-4">
      <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
        Fragen zur Geschichte
      </h3>

      <div class="space-y-4">
        {#each currentChapter.questions as q, qIdx (q.id)}
          <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-start gap-2.5">
                <span class="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold shrink-0 mt-0.5">
                  {qIdx + 1}
                </span>
                <h4 class="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {q.questionGerman}
                </h4>
              </div>

              {#if q.lastEvaluation}
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 {q.lastEvaluation.overallVerdict === 'excellent' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'}">
                  {q.lastEvaluation.verdictLabel}
                </span>
              {/if}
            </div>

            <textarea
              bind:value={q.userDraftAnswer}
              placeholder="Antwort auf Deutsch formulieren..."
              rows="2"
              class="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm leading-relaxed placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            ></textarea>

            <div class="flex items-center justify-end">
              <button
                type="button"
                class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 active:scale-95 text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                on:click={() => handleCheckAnswer(q)}
                disabled={q.isEvaluating || !q.userDraftAnswer.trim()}
              >
                {#if q.isEvaluating}
                  <svg class="animate-spin h-3.5 w-3.5 text-white dark:text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Prüfe...</span>
                {:else}
                  <span>{q.lastEvaluation ? 'Erneut prüfen' : 'Antwort prüfen'}</span>
                {/if}
              </button>
            </div>

            {#if q.lastEvaluation}
              <div class="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                {#if q.lastEvaluation.socraticGuidance}
                  <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 flex items-start gap-2">
                    <span class="text-sm">💡</span>
                    <div>
                      <span class="font-semibold">Tipp:</span> {q.lastEvaluation.socraticGuidance}
                    </div>
                  </div>
                {/if}

                <AnnotationViewer 
                  text={q.lastEvaluation.userAnswerAtEvaluation}
                  annotations={q.lastEvaluation.annotations}
                />
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </section>

    <!-- 3. Collaborative Story Continuation -->
    <section class="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
      <div class="space-y-1">
        <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Geschichte weiterschreiben
        </h3>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Wie geht die Handlung weiter? Verfasse den nächsten Abschnitt auf Deutsch.
        </p>
      </div>

      <textarea
        bind:value={currentChapterItem.userContinuation}
        placeholder="Schreibe hier deine Fortsetzung der Handlung..."
        rows="3"
        class="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm leading-relaxed placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      ></textarea>

      <!-- First Action: Check Continuation -->
      <div class="flex items-center justify-end">
        <button
          type="button"
          class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 disabled:opacity-50"
          on:click={handleCheckContinuation}
          disabled={isEvaluatingContinuation || !currentChapterItem.userContinuation.trim()}
        >
          {#if isEvaluatingContinuation}
            <span>Prüfe Fortsetzung...</span>
          {:else}
            <span>Fortsetzung überprüfen</span>
          {/if}
        </button>
      </div>

      <!-- Continuation Feedback Display if checked -->
      {#if currentChapterItem.continuationEvaluation}
        {@const cEval = currentChapterItem.continuationEvaluation}
        <div class="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
          {#if cEval.socraticGuidance}
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 flex items-start gap-2">
              <span class="text-sm">💡</span>
              <div>
                <span class="font-semibold">Tipp:</span> {cEval.socraticGuidance}
              </div>
            </div>
          {/if}

          <AnnotationViewer
            text={cEval.userContinuationAtEvaluation}
            annotations={cEval.annotations}
          />
        </div>
      {/if}

      <!-- Bottom Button: Mit Gemini weiterschreiben (placed at the very end) -->
      <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
        <button
          type="button"
          class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs sm:text-sm font-bold transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
          on:click={handleContinueStoryWithAI}
          disabled={isContinuingStory || !currentChapterItem.userContinuation.trim()}
        >
          {#if isContinuingStory}
            <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Gemini schreibt weiter...</span>
          {:else}
            <span>Mit Gemini weiterschreiben</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          {/if}
        </button>
      </div>
    </section>
  {/if}

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
            class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl leading-none"
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
          Gib deinen OpenRouter API-Schlüssel ein. Sobald der Schlüssel verifiziert wurde, wird die Geschichte freigeschaltet.
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
              class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 select-none"
              on:click={() => showApiKeyText = !showApiKeyText}
            >
              {showApiKeyText ? 'Verbergen' : 'Zeigen'}
            </button>
          </div>
          <div class="text-[11px]">
            <a 
              href="https://openrouter.ai/keys" 
              target="_blank" 
              rel="noopener noreferrer"
              class="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Neuen Schlüssel auf openrouter.ai erstellen →
            </a>
          </div>
        </div>

        <div class="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          {#if apiKey}
            <button
              type="button"
              class="text-xs text-rose-600 dark:text-rose-400 hover:underline font-semibold"
              on:click={handleClearApiKey}
            >
              Entfernen
            </button>
          {:else}
            <div></div>
          {/if}

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
              on:click={() => showApiKeyModal = false}
            >
              Abbrechen
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-xs font-bold text-white shadow-xs disabled:opacity-50 flex items-center gap-1.5"
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
                <span>Speichern & Verifizieren</span>
              {/if}
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
