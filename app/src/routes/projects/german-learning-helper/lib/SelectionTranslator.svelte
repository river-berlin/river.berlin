<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { translateSelectionStream, TRANSLATION_MODEL } from './openrouter';
  import { flashcards } from './flashcards';
  import type { OpenRouterConfig } from './types';

  export let apiKey: string = '';
  export let targetContainer: HTMLElement | null = null;

  let isVisible = false;
  let isLoading = false;
  let selectedText = '';
  let translation = '';
  let explanation = '';
  let contextSentence = '';
  let position = { x: 0, y: 0 };
  let popupElement: HTMLElement | null = null;
  let isSpeaking = false;
  let translationAbortController: AbortController | null = null;

  // Local cache for fast repeated lookups
  const translationCache = new Map<string, { translation: string; explanation?: string }>();

  // Check if current selected word is saved in flashcards
  $: isMarked = $flashcards.some(
    (card) => card.german.trim().toLowerCase() === selectedText.trim().toLowerCase()
  );

  onMount(() => {
    flashcards.init();
    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('touchend', handleSelection);
    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
  });

  onDestroy(() => {
    if (translationAbortController) {
      translationAbortController.abort();
      translationAbortController = null;
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('touchend', handleSelection);
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    }
  });

  function handleOutsideClick(event: MouseEvent) {
    if (popupElement && popupElement.contains(event.target as Node)) {
      return;
    }
    if (isVisible) {
      isVisible = false;
    }
  }

  function handleScroll() {
    if (isVisible) {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        isVisible = false;
        return;
      }
      try {
        const range = sel.getRangeAt(0);
        updatePopupPosition(range);
      } catch {
        isVisible = false;
      }
    }
  }

  async function handleSelection(event: Event) {
    // Wait a tick for selection to complete
    setTimeout(async () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        return;
      }

      const text = selection.toString().trim();
      if (!text || text.length < 1 || text.length > 250) {
        return;
      }

      // Ensure selection is inside targetContainer
      if (targetContainer) {
        const anchor = selection.anchorNode;
        const focus = selection.focusNode;
        if (!anchor || !focus || !targetContainer.contains(anchor) || !targetContainer.contains(focus)) {
          return;
        }
      }

      const range = selection.getRangeAt(0);
      updatePopupPosition(range);

      selectedText = text;
      isVisible = true;

      // Extract context sentence
      if (range.commonAncestorContainer) {
        contextSentence = (range.commonAncestorContainer.textContent || '').trim().slice(0, 300);
      } else {
        contextSentence = '';
      }

      // Cancel any in-flight translation request
      if (translationAbortController) {
        translationAbortController.abort();
        translationAbortController = null;
      }

      // Check cache first (0ms instant response)
      if (translationCache.has(text)) {
        const cached = translationCache.get(text)!;
        translation = cached.translation;
        explanation = cached.explanation || '';
        isLoading = false;
        return;
      }

      // If API key is available, stream translation
      if (apiKey && apiKey.trim()) {
        const controller = new AbortController();
        translationAbortController = controller;

        isLoading = true;
        translation = '';
        explanation = '';

        try {
          const config: OpenRouterConfig = {
            apiKey: apiKey.trim(),
            model: TRANSLATION_MODEL,
            siteUrl: typeof window !== 'undefined' ? window.location.origin : 'https://river.berlin',
            siteName: 'river.berlin German Learning Helper'
          };

          const res = await translateSelectionStream(
            config,
            text,
            contextSentence,
            (partial) => {
              if (!controller.signal.aborted) {
                translation = partial.translation;
                explanation = partial.explanation;
                if (partial.translation) {
                  isLoading = false; // Turn off spinner the moment first token arrives!
                }
              }
            },
            controller.signal
          );

          if (!controller.signal.aborted) {
            translation = res.translation;
            explanation = res.explanation;
            translationCache.set(text, res);
          }
        } catch (err: any) {
          if (err.name === 'AbortError' || controller.signal.aborted) {
            return;
          }
          console.warn('gpt-oss-120b translation failed, falling back to gemini-flash:', err);
          
          // Graceful fallback to gemini-3.8-flash
          try {
            const fallbackConfig: OpenRouterConfig = {
              apiKey: apiKey.trim(),
              model: 'google/gemini-3.8-flash',
              siteUrl: typeof window !== 'undefined' ? window.location.origin : 'https://river.berlin',
              siteName: 'river.berlin German Learning Helper'
            };

            const fallbackRes = await translateSelectionStream(
              fallbackConfig,
              text,
              contextSentence,
              (partial) => {
                if (!controller.signal.aborted) {
                  translation = partial.translation;
                  explanation = partial.explanation;
                  if (partial.translation) {
                    isLoading = false;
                  }
                }
              },
              controller.signal
            );

            if (!controller.signal.aborted) {
              translation = fallbackRes.translation;
              explanation = fallbackRes.explanation;
              translationCache.set(text, fallbackRes);
            }
          } catch (fallbackErr: any) {
            if (fallbackErr.name === 'AbortError' || controller.signal.aborted) return;
            translation = 'Übersetzung nicht verfügbar';
          }
        } finally {
          if (!controller.signal.aborted) {
            isLoading = false;
            translationAbortController = null;
          }
        }
      }
    }, 10);
  }

  function updatePopupPosition(range: Range) {
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    // Position centered above the selection
    const popupWidth = 280;
    let x = rect.left + rect.width / 2;
    let y = rect.top - 10;

    // Viewport boundaries
    const margin = 12;
    if (x - popupWidth / 2 < margin) {
      x = popupWidth / 2 + margin;
    } else if (x + popupWidth / 2 > window.innerWidth - margin) {
      x = window.innerWidth - popupWidth / 2 - margin;
    }

    position = { x, y };
  }

  function speakSelectedWord() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !selectedText) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(selectedText);
    utterance.lang = 'de-DE';
    utterance.rate = 0.95;
    utterance.onstart = () => isSpeaking = true;
    utterance.onend = () => isSpeaking = false;
    utterance.onerror = () => isSpeaking = false;
    window.speechSynthesis.speak(utterance);
  }

  function toggleMarkForLearning() {
    if (!selectedText) return;

    if (isMarked) {
      flashcards.removeByGerman(selectedText);
    } else {
      flashcards.add({
        german: selectedText,
        translation: translation || '—',
        explanation: explanation || undefined,
        contextSentence: contextSentence || undefined
      });
    }
  }

  function closePopup() {
    isVisible = false;
  }
</script>

{#if isVisible}
  <div
    bind:this={popupElement}
    class="fixed z-50 -translate-x-1/2 -translate-y-full w-72 sm:w-80 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md"
    style="left: {position.x}px; top: {position.y}px;"
    role="tooltip"
  >
    <!-- Header with selected word and audio/close buttons -->
    <div class="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
      <div class="flex items-center gap-1.5 min-w-0">
        <span class="font-bold text-slate-900 dark:text-slate-100 truncate text-sm">
          »{selectedText}«
        </span>
        <button
          type="button"
          class="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 shrink-0 transition-colors"
          on:click={speakSelectedWord}
          title="Aussprechen"
          aria-label="Aussprechen"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.5A2.25 2.25 0 002.25 9.75v4.5A2.25 2.25 0 004.5 16.5h1.94l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z"/>
            <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z"/>
          </svg>
        </button>
      </div>

      <button
        type="button"
        class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-base leading-none p-0.5 rounded"
        on:click={closePopup}
        aria-label="Schließen"
      >
        ×
      </button>
    </div>

    <!-- Translation Content -->
    {#if isLoading}
      <div class="flex items-center gap-2 text-slate-500 dark:text-slate-400 py-1">
        <svg class="animate-spin h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Übersetze...</span>
      </div>
    {:else if translation}
      <div class="space-y-1">
        <div class="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
          {translation}
        </div>
        {#if explanation}
          <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            {explanation}
          </p>
        {/if}
      </div>
    {/if}

    <!-- Bottom Action: Mark for learning / Flashcard -->
    <div class="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
      <button
        type="button"
        class="w-full py-1.5 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border active:scale-95 {isMarked
          ? 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/80 dark:hover:bg-amber-900/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 shadow-2xs'
          : 'bg-slate-50 hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300 hover:text-amber-800 dark:hover:text-amber-300 border-slate-200 dark:border-slate-700'}"
        on:click={toggleMarkForLearning}
        title={isMarked ? 'Aus Lernliste entfernen' : 'Für späteres Lernen (Flashcards) merken'}
      >
        {#if isMarked}
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-amber-500 fill-amber-500" viewBox="0 0 24 24">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
          </svg>
          <span class="font-bold">Gemerkt (Lernliste)</span>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
          </svg>
          <span>Wort merken (Flashcards)</span>
        {/if}
      </button>
    </div>

    <!-- Tooltip Arrow pointer -->
    <div 
      class="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-6 border-x-transparent border-t-6 border-t-white dark:border-t-slate-900 drop-shadow-xs pointer-events-none"
    ></div>
  </div>
{/if}
