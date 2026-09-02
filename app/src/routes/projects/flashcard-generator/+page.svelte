<script lang="ts">
  import { onMount } from 'svelte';
  import type { Flashcard, OpenRouterConfig } from './lib/types';
  import { 
    DEFAULT_MODEL, 
    verifyApiKey, 
    generateFlashcardsStream,
    generateFlashcardsFromAudioStream 
  } from './lib/generator';
  import { 
    downloadRewordCsv, 
    copyRewordToClipboard, 
    downloadAnkiTsv, 
    copyAnkiToClipboard 
  } from './lib/export';
  import VoiceInput from './lib/VoiceInput.svelte';

  const STORAGE_KEY_API_KEY = 'german_helper_openrouter_key';
  const STORAGE_KEY_CARDS = 'flashcard_generator_deck_v1';

  // API Key state
  let apiKey = '';
  let inputApiKey = '';
  let showApiKeyModal = false;
  let showApiKeyText = false;
  let isApiKeyVerified = false;
  let isVerifyingKey = false;
  let modalErrorMessage: string | null = null;
  let pageErrorMessage: string | null = null;

  // Single Input state
  let inputPrompt = '';
  let cards: Flashcard[] = [];
  let isGenerating = false;
  let isGeneratingAudio = false;
  let streamingRawText = '';
  let abortController: AbortController | null = null;

  // Copy success toasts
  let copyRewordSuccess = false;
  let copyAnkiSuccess = false;
  let copyTimeout: any = null;

  // PWA install state
  let deferredPrompt: any = null;
  let canInstallPwa = false;
  let showIosInstallGuide = false;

  onMount(async () => {
    // 1. Check existing API Key from storage
    const savedKey = localStorage.getItem(STORAGE_KEY_API_KEY) || localStorage.getItem('flashcard_generator_api_key');
    if (savedKey && savedKey.trim()) {
      apiKey = savedKey.trim();
      inputApiKey = savedKey.trim();
      isVerifyingKey = true;
      const res = await verifyApiKey(apiKey);
      isVerifyingKey = false;
      if (res.valid) {
        isApiKeyVerified = true;
      } else {
        apiKey = '';
        isApiKeyVerified = false;
      }
    }

    // 2. Load saved flashcards
    const savedDeck = localStorage.getItem(STORAGE_KEY_CARDS);
    if (savedDeck) {
      try {
        const parsed = JSON.parse(savedDeck);
        if (Array.isArray(parsed) && parsed.length > 0) {
          cards = parsed;
        }
      } catch (e) {
        console.warn('Fehler beim Laden des Decks:', e);
      }
    }

    // 3. PWA install prompt handler
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      canInstallPwa = true;
    });
  });

  function saveDeckToStorage() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(cards));
  }

  function getOpenRouterConfig(): OpenRouterConfig {
    return {
      apiKey: apiKey.trim(),
      model: DEFAULT_MODEL,
      siteUrl: typeof window !== 'undefined' ? window.location.origin : 'https://river.berlin',
      siteName: 'river.berlin Flashcard Generator'
    };
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

  // Handle generating flashcards from typed Text
  async function handleGenerateFromText() {
    if (!isApiKeyVerified || !apiKey.trim()) {
      showApiKeyModal = true;
      return;
    }

    if (isGenerating) {
      handleCancelGeneration();
      return;
    }

    if (!inputPrompt.trim()) {
      pageErrorMessage = 'Bitte gib Vokabeln, Sätze oder ein Thema ein.';
      return;
    }

    const controller = new AbortController();
    abortController = controller;

    isGenerating = true;
    isGeneratingAudio = false;
    streamingRawText = '';
    pageErrorMessage = null;

    try {
      const newCards = await generateFlashcardsStream(
        getOpenRouterConfig(),
        inputPrompt.trim(),
        'free_prompt',
        'C1',
        6,
        (accumulated) => {
          if (!controller.signal.aborted) {
            streamingRawText = accumulated;
          }
        },
        controller.signal
      );

      if (!controller.signal.aborted && newCards.length > 0) {
        cards = [...newCards, ...cards];
        saveDeckToStorage();
        inputPrompt = '';
        streamingRawText = '';
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        return;
      }
      console.error(err);
      pageErrorMessage = err.message || 'Fehler beim Erstellen der Karteikarten.';
    } finally {
      abortController = null;
      isGenerating = false;
      streamingRawText = '';
    }
  }

  // Handle generating flashcards directly from recorded Audio
  async function handleGenerateFromAudio(base64Audio: string, mimeType: string) {
    if (!isApiKeyVerified || !apiKey.trim()) {
      showApiKeyModal = true;
      return;
    }

    if (isGenerating) {
      handleCancelGeneration();
    }

    const controller = new AbortController();
    abortController = controller;

    isGenerating = true;
    isGeneratingAudio = true;
    streamingRawText = '';
    pageErrorMessage = null;

    try {
      const newCards = await generateFlashcardsFromAudioStream(
        getOpenRouterConfig(),
        base64Audio,
        mimeType,
        (accumulated) => {
          if (!controller.signal.aborted) {
            streamingRawText = accumulated;
          }
        },
        controller.signal
      );

      if (!controller.signal.aborted && newCards.length > 0) {
        cards = [...newCards, ...cards];
        saveDeckToStorage();
        streamingRawText = '';
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        return;
      }
      console.error(err);
      pageErrorMessage = err.message || 'Fehler bei der Audio-Verarbeitung durch Gemini.';
    } finally {
      abortController = null;
      isGenerating = false;
      isGeneratingAudio = false;
      streamingRawText = '';
    }
  }

  function handleCancelGeneration() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    isGenerating = false;
    isGeneratingAudio = false;
    streamingRawText = '';
  }

  function handleSpeak(text?: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE';
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }

  function handleRemoveCard(id: string) {
    cards = cards.filter((c) => c.id !== id);
    saveDeckToStorage();
  }

  function handleClearAllCards() {
    if (confirm('Möchtest du alle Karteikarten löschen?')) {
      cards = [];
      saveDeckToStorage();
    }
  }

  async function handleCopyReword() {
    const ok = await copyRewordToClipboard(cards);
    if (ok) {
      copyRewordSuccess = true;
      if (copyTimeout) clearTimeout(copyTimeout);
      copyTimeout = setTimeout(() => (copyRewordSuccess = false), 3000);
    }
  }

  async function handleCopyAnki() {
    const ok = await copyAnkiToClipboard(cards);
    if (ok) {
      copyAnkiSuccess = true;
      if (copyTimeout) clearTimeout(copyTimeout);
      copyTimeout = setTimeout(() => (copyAnkiSuccess = false), 3000);
    }
  }

  async function handleInstallPwa() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        canInstallPwa = false;
      }
      deferredPrompt = null;
    } else {
      showIosInstallGuide = !showIosInstallGuide;
    }
  }
</script>

<svelte:head>
  <title>German Flashcard Generator | river.berlin</title>
  <meta name="description" content="AI German Flashcard Creator for Reword CSV and Anki with direct voice audio input" />
  <link rel="manifest" href="/manifest.json" />
  <meta name="theme-color" content="#4f46e5" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Flashcards" />
</svelte:head>

<div class="max-w-3xl mx-auto space-y-6 py-6 px-3 sm:px-4 font-sans text-slate-900 dark:text-slate-100">
  <!-- Minimalist Header -->
  <header class="rounded-2xl bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
    <div class="flex items-center gap-2.5">
      <div class="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600 text-white font-bold text-lg shadow-sm">
        📇
      </div>
      <div>
        <h1 class="text-lg sm:text-xl font-extrabold tracking-tight">
          German Flashcard Generator
        </h1>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Reword CSV & Anki • Text- & direkte Audioeingabe
        </p>
      </div>
    </div>

    <!-- Top Controls: Install & API Key -->
    <div class="flex items-center gap-2">
      <!-- PWA Install Button -->
      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all active:scale-95 cursor-pointer"
        on:click={handleInstallPwa}
        title="Als Web-App auf dem Smartphone / Desktop installieren"
      >
        <span>📲 App installieren</span>
      </button>

      <!-- API Key Button -->
      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 cursor-pointer {isApiKeyVerified 
          ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700' 
          : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 animate-pulse'}"
        on:click={() => { inputApiKey = apiKey; modalErrorMessage = null; showApiKeyModal = true; }}
      >
        <span class="inline-block w-2 h-2 rounded-full {isApiKeyVerified ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
        <span>{isApiKeyVerified ? 'API-Schlüssel' : 'API-Schlüssel fehlt'}</span>
      </button>
    </div>
  </header>

  <!-- iOS PWA Install Tooltip -->
  {#if showIosInstallGuide}
    <div class="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 space-y-1 animate-in fade-in">
      <div class="flex items-center justify-between">
        <span class="font-bold">📲 Installation auf Smartphone:</span>
        <button type="button" class="text-indigo-500 font-bold" on:click={() => showIosInstallGuide = false}>✕</button>
      </div>
      <p><strong>iPhone / iPad (Safari):</strong> Tippe auf das Teilen-Symbol ⎋ und wähle <strong>»Zum Home-Bildschirm« ➕</strong>.</p>
      <p><strong>Android (Chrome):</strong> Tippe auf die drei Punkte ⋮ und wähle <strong>»App installieren«</strong>.</p>
    </div>
  {/if}

  <!-- Error Banner -->
  {#if pageErrorMessage}
    <div class="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-3">
      <span>⚠️ {pageErrorMessage}</span>
      <button type="button" class="text-rose-500 text-base" on:click={() => pageErrorMessage = null}>✕</button>
    </div>
  {/if}

  <!-- API Key Lock Banner if not entered -->
  {#if !isApiKeyVerified}
    <div class="p-6 rounded-2xl bg-amber-50/90 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 space-y-3.5 text-center shadow-xs">
      <div class="w-10 h-10 mx-auto rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300 flex items-center justify-center text-xl">
        🔑
      </div>
      <div class="space-y-1">
        <h3 class="text-sm sm:text-base font-bold text-amber-900 dark:text-amber-200">
          OpenRouter API-Schlüssel erforderlich
        </h3>
        <p class="text-xs text-amber-700 dark:text-amber-300/90 max-w-md mx-auto leading-relaxed">
          Bitte gib deinen OpenRouter-Schlüssel ein, um die KI-Karteikarten-Generierung freizuschalten.
        </p>
      </div>
      <div class="max-w-md mx-auto flex gap-2">
        <input
          type="password"
          bind:value={inputApiKey}
          placeholder="sk-or-v1-xxxxxxxxxxxxxxxx"
          class="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button
          type="button"
          class="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          on:click={handleSaveAndVerifyApiKey}
          disabled={isVerifyingKey || !inputApiKey.trim()}
        >
          {isVerifyingKey ? 'Prüfe...' : 'Aktivieren'}
        </button>
      </div>
    </div>
  {:else}
    <!-- Main Simplified Generator: Single Textbox + Direct Audio Recording -->
    <section class="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div class="space-y-2">
        <textarea
          bind:value={inputPrompt}
          placeholder="Wörter, Sätze, Grammatik-Thema oder Fehler eingeben (z.B. »die Kaution, warten auf + Akk, Fehler: wegen dem«) ODER unten Audio aufnehmen..."
          rows="3"
          class="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm leading-relaxed placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        ></textarea>

        <!-- Actions Bar: Direct Audio Recording & Generate Button -->
        <div class="flex items-center justify-between gap-3 flex-wrap pt-1">
          <!-- Voice Input Component (Direct Audio to Gemini) -->
          <VoiceInput onAudioRecorded={handleGenerateFromAudio} disabled={isGenerating} />

          <!-- Generate Button with Hover-to-Cancel -->
          <button
            type="button"
            class="group px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm active:scale-95 flex items-center gap-2 cursor-pointer {isGenerating
              ? 'bg-slate-800 text-white hover:bg-rose-600 dark:bg-slate-700 dark:hover:bg-rose-600'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'}"
            on:click={handleGenerateFromText}
            disabled={!isGenerating && !inputPrompt.trim()}
          >
            {#if isGenerating}
              <span class="group-hover:hidden flex items-center gap-2">
                <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{isGeneratingAudio ? 'Analysiere Audio...' : 'Generiere Karten...'}</span>
              </span>
              <span class="hidden group-hover:flex items-center gap-1.5 font-bold">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Abbrechen</span>
              </span>
            {:else}
              <span>Karteikarten erstellen ✨</span>
            {/if}
          </button>
        </div>
      </div>
    </section>

    <!-- Live Streaming Preview -->
    {#if isGenerating && streamingRawText}
      <div class="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2 animate-in fade-in">
        <div class="flex items-center justify-between gap-2 border-b border-indigo-200/80 dark:border-indigo-800/80 pb-2">
          <div class="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-300 text-xs">
            <span class="inline-block w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
            <span>{isGeneratingAudio ? '🎙️ Sprachaufnahme wird analysiert & Karten werden erstellt...' : 'Reword-Karteikarten werden erstellt...'}</span>
          </div>
          <button
            type="button"
            class="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
            on:click={handleCancelGeneration}
          >
            Abbrechen ✕
          </button>
        </div>
        <pre class="font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-40 p-2 rounded-lg bg-white/60 dark:bg-slate-900/60">
          {streamingRawText}
        </pre>
      </div>
    {/if}

    <!-- Flashcards Deck & Download Buttons -->
    <section class="space-y-4">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div class="flex items-center gap-2">
          <h2 class="text-base sm:text-lg font-bold">
            Karteikarten ({cards.length})
          </h2>
        </div>

        {#if cards.length > 0}
          <div class="flex items-center gap-2 flex-wrap">
            <!-- Reword CSV Download -->
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
              on:click={() => downloadRewordCsv(cards)}
              title="Download als Reword-kompatible CSV-Datei mit Semikolon-Trennung"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.5V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              <span>Reword (.csv)</span>
            </button>

            <!-- Copy Reword -->
            <button
              type="button"
              class="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer {copyRewordSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'}"
              on:click={handleCopyReword}
              title="Kopiert alle Karten im Reword-Format"
            >
              <span>{copyRewordSuccess ? '✓ Kopiert' : 'Kopieren (Reword)'}</span>
            </button>

            <!-- Anki TSV Download -->
            <button
              type="button"
              class="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all active:scale-95 cursor-pointer"
              on:click={() => downloadAnkiTsv(cards)}
              title="Download als Anki TSV"
            >
              <span>Anki (.tsv)</span>
            </button>

            <!-- Clear All -->
            <button
              type="button"
              class="text-xs text-rose-600 hover:underline px-2 py-1 cursor-pointer"
              on:click={handleClearAllCards}
              title="Alle Karten löschen"
            >
              Löschen 🗑️
            </button>
          </div>
        {/if}
      </div>

      <!-- Card Items -->
      {#if cards.length === 0}
        <div class="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          Noch keine Karten erstellt. Gib oben Wörter ein oder nimm eine Sprachnachricht auf und klicke auf »Karteikarten erstellen«.
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {#each cards as card (card.id)}
            <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
              <!-- Top Row: German Word & Audio / Delete -->
              <div class="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <div class="flex items-center gap-1.5 min-w-0">
                  <span class="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                    {card.face1}
                  </span>
                  <button
                    type="button"
                    class="p-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg transition-colors cursor-pointer"
                    on:click={() => handleSpeak(card.face1.replace(/\(.*?\)/g, '').trim())}
                    title="Aussprache"
                  >
                    🔊
                  </button>
                </div>
                <button
                  type="button"
                  class="text-slate-400 hover:text-rose-600 p-1 text-xs cursor-pointer"
                  on:click={() => handleRemoveCard(card.id)}
                  title="Entfernen"
                >
                  ✕
                </button>
              </div>

              <!-- Translation -->
              <div class="text-xs sm:text-sm font-bold text-indigo-600 dark:text-indigo-400">
                → {card.face2}
              </div>

              <!-- Details / Grammar Small Print -->
              {#if card.details}
                <div class="p-2 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200">
                  <span class="font-bold text-[10px] uppercase tracking-wider text-amber-800 dark:text-amber-300 block mb-0.5">Grammatik & Rektion:</span>
                  <p class="leading-snug">{card.details}</p>
                </div>
              {/if}

              <!-- Example Sentences -->
              <div class="space-y-1.5 text-xs">
                <div class="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-0.5">
                  <p class="font-medium text-slate-900 dark:text-slate-100">{card.sentence1}</p>
                  <p class="text-[11px] text-slate-500 italic">{card.sentence1_detail}</p>
                </div>

                {#if card.sentence2}
                  <div class="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-0.5">
                    <p class="font-medium text-slate-900 dark:text-slate-100">{card.sentence2}</p>
                    {#if card.sentence2_detail}
                      <p class="text-[11px] text-slate-500 italic">{card.sentence2_detail}</p>
                    {/if}
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  {/if}

  <!-- API Key Modal -->
  {#if showApiKeyModal}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div class="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 animate-in zoom-in-95">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 class="text-base font-bold">OpenRouter API-Schlüssel</h3>
          <button type="button" class="text-slate-400 hover:text-slate-600 text-xl cursor-pointer" on:click={() => showApiKeyModal = false}>×</button>
        </div>

        {#if modalErrorMessage}
          <div class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs">
            {modalErrorMessage}
          </div>
        {/if}

        <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Trage deinen OpenRouter API-Schlüssel ein. Er wird sicher in deinem Browser gespeichert.
        </p>

        <div class="relative">
          <input
            type={showApiKeyText ? 'text' : 'password'}
            bind:value={inputApiKey}
            placeholder="sk-or-v1-xxxxxxxxxxxxxxxx"
            class="w-full px-3.5 py-2.5 pr-12 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="button"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 px-1.5 py-1 cursor-pointer"
            on:click={() => showApiKeyText = !showApiKeyText}
          >
            {showApiKeyText ? 'Verstecken' : 'Zeigen'}
          </button>
        </div>

        <div class="flex items-center justify-between pt-2">
          {#if isApiKeyVerified}
            <button type="button" class="text-xs text-rose-600 hover:underline cursor-pointer" on:click={handleClearApiKey}>
              Schlüssel entfernen
            </button>
          {:else}
            <div></div>
          {/if}

          <div class="flex items-center gap-2">
            <button type="button" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer" on:click={() => showApiKeyModal = false}>
              Abbrechen
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              on:click={handleSaveAndVerifyApiKey}
              disabled={isVerifyingKey || !inputApiKey.trim()}
            >
              {#if isVerifyingKey}
                <span>Verifiziere...</span>
              {:else}
                <span>Speichern</span>
              {/if}
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
