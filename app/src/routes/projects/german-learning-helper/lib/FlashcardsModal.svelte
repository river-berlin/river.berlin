<script lang="ts">
  import { 
    flashcards, 
    exportToRewordCsv,
    exportToAnkiTsv, 
    exportToJson, 
    copyRewordToClipboard,
    copyFlashcardsToClipboard 
  } from './flashcards';
  import type { FlashcardItem } from './types';

  export let isOpen: boolean = false;
  export let onClose: () => void = () => {};

  let searchQuery = '';
  let copySuccess = false;
  let copyTimeout: any = null;

  $: items = $flashcards;
  $: filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.german.toLowerCase().includes(q) ||
      (item.translation && item.translation.toLowerCase().includes(q)) ||
      (item.explanation && item.explanation.toLowerCase().includes(q))
    );
  });

  async function handleCopyReword() {
    const ok = await copyRewordToClipboard(items);
    if (ok) {
      copySuccess = true;
      if (copyTimeout) clearTimeout(copyTimeout);
      copyTimeout = setTimeout(() => {
        copySuccess = false;
      }, 3000);
    }
  }

  function handleSpeak(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE';
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }

  function handleExportReword() {
    exportToRewordCsv(items);
  }

  function handleExportAnki() {
    exportToAnkiTsv(items);
  }

  function handleExportJson() {
    exportToJson(items);
  }

  function handleRemove(id: string) {
    flashcards.remove(id);
  }

  function handleClearAll() {
    if (confirm('Möchtest du wirklich alle gemerkten Vokabeln löschen?')) {
      flashcards.clearAll();
    }
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
    <div 
      class="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95"
      role="dialog"
      aria-modal="true"
    >
      <!-- Header -->
      <div class="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40">
        <div class="flex items-center gap-2.5">
          <div class="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
            </svg>
          </div>
          <div>
            <h3 class="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Lernliste & Flashcards
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              {items.length} {items.length === 1 ? 'Vokabel gemerkt' : 'Vokabeln gemerkt'}
            </p>
          </div>
        </div>

        <button 
          type="button" 
          class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          on:click={onClose}
          aria-label="Schließen"
        >
          ×
        </button>
      </div>

      <!-- Action & Export Bar -->
      {#if items.length > 0}
        <div class="p-3 sm:px-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2.5">
          <!-- Search box -->
          <div class="relative flex-1 min-w-[150px] max-w-xs">
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="Vokabeln durchsuchen..."
              class="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>

          <!-- Export Buttons -->
          <div class="flex items-center gap-1.5 flex-wrap">
            <!-- Export Reword CSV Button -->
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold transition-all shadow-2xs"
              on:click={handleExportReword}
              title="Download als Reword-kompatible CSV-Datei mit Semikolon-Trennung"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.5V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              <span>Reword (.csv)</span>
            </button>

            <!-- Copy to Clipboard in Reword format -->
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 {copySuccess 
                ? 'bg-emerald-600 text-white' 
                : 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'}"
              on:click={handleCopyReword}
              title="Kopiert die Vokabeln im Reword-CSV-Format in die Zwischenablage"
            >
              {#if copySuccess}
                <span>✓ Kopiert!</span>
              {:else}
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
                <span>Kopieren (Reword)</span>
              {/if}
            </button>

            <!-- Export Anki TSV -->
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
              on:click={handleExportAnki}
              title="Download als Anki (.tsv)"
            >
              <span>Anki</span>
            </button>

            <!-- Export JSON -->
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all"
              on:click={handleExportJson}
              title="Download als JSON"
            >
              <span>JSON</span>
            </button>
          </div>
        </div>
      {/if}

      <!-- Vocabulary Card List -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
        {#if items.length === 0}
          <div class="text-center py-12 px-4 space-y-3">
            <div class="w-12 h-12 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center text-xl">
              ⭐
            </div>
            <h4 class="text-sm font-bold text-slate-800 dark:text-slate-200">
              Noch keine Vokabeln gemerkt
            </h4>
            <p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              Markiere beliebige Wörter oder Wendungen in der Geschichte und klicke im Übersetzungs-Popover auf <strong>»Wort merken ⭐«</strong>, um sie hier für deine Reword-App zu sammeln.
            </p>
          </div>
        {:else if filteredItems.length === 0}
          <div class="text-center py-8 text-xs text-slate-500">
            Keine passenden Vokabeln zu "{searchQuery}" gefunden.
          </div>
        {:else}
          {#each filteredItems as item (item.id)}
            <div class="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 transition-colors space-y-2 group">
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-baseline gap-2 flex-wrap">
                  <span class="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                    {item.german}
                  </span>
                  
                  <button
                    type="button"
                    class="p-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg transition-colors"
                    on:click={() => handleSpeak(item.german)}
                    title="Aussprache anhören"
                    aria-label="Aussprache anhören"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.5A2.25 2.25 0 002.25 9.75v4.5A2.25 2.25 0 004.5 16.5h1.94l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z"/>
                    </svg>
                  </button>

                  <span class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    → {item.translation}
                  </span>
                </div>

                <button
                  type="button"
                  class="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded transition-colors text-sm"
                  on:click={() => handleRemove(item.id)}
                  title="Aus Lernliste entfernen"
                  aria-label="Entfernen"
                >
                  ✕
                </button>
              </div>

              {#if item.explanation}
                <p class="text-xs text-slate-600 dark:text-slate-300 leading-snug">
                  {item.explanation}
                </p>
              {/if}

              {#if item.contextSentence}
                <p class="text-[11px] text-slate-500 dark:text-slate-400 italic bg-white/70 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700/50">
                  »{item.contextSentence}«
                </p>
              {/if}
            </div>
          {/each}
        {/if}
      </div>

      <!-- Footer -->
      <div class="p-3.5 sm:px-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between text-xs">
        {#if items.length > 0}
          <button
            type="button"
            class="text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline"
            on:click={handleClearAll}
          >
            Alle Vokabeln löschen
          </button>
        {:else}
          <div></div>
        {/if}

        <button
          type="button"
          class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white font-bold transition-all"
          on:click={onClose}
        >
          Schließen
        </button>
      </div>
    </div>
  </div>
{/if}
