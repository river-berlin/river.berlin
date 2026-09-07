<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    searchArticlesByTitle, 
    type NewsArticle, 
    type ArticleSearchResult 
  } from './huggingfaceDataset';

  export let isOpen = false;
  export let articles: NewsArticle[] = [];
  export let currentArticleNum: number | null = null;
  export let isLoading = false;
  export let onSelectArticle: (articleNum: number) => void;
  export let onClose: () => void;

  let searchQuery = '';
  let selectedCategory = 'Alle';
  let searchInput: HTMLInputElement | null = null;

  // Derive available categories dynamically
  $: categories = ['Alle', ...Array.from(new Set(articles.map(a => a.category))).filter(Boolean).sort()];

  // Filtered results
  let searchResults: ArticleSearchResult[] = [];
  $: {
    if (articles && articles.length > 0) {
      searchResults = searchArticlesByTitle(articles, searchQuery, selectedCategory, 60);
    } else {
      searchResults = [];
    }
  }

  // Focus input when opened
  $: if (isOpen) {
    setTimeout(() => {
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }, 60);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!isOpen) return;
    if (e.key === 'Escape') {
      onClose();
    }
  }

  function handleSelect(index: number) {
    onSelectArticle(index);
    onClose();
  }

  function getCategoryColor(cat: string): string {
    const c = cat.toLowerCase();
    if (c.includes('sport')) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    if (c.includes('wirtsch')) return 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    if (c.includes('kultur')) return 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    if (c.includes('web') || c.includes('wissensch')) return 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800';
    if (c.includes('inland')) return 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    if (c.includes('ausland') || c.includes('inter')) return 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800';
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  }
</script>

<svelte:window on:keydown={handleKeyDown} />

{#if isOpen}
  <div 
    class="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 sm:pt-12 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
    on:click|self={onClose}
    role="presentation"
  >
    <div
      class="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95"
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-modal-title"
    >
      <!-- Modal Header -->
      <div class="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 space-y-3">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <div class="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <div>
              <h3 id="search-modal-title" class="text-base font-bold text-slate-900 dark:text-slate-100">
                Zeitungsartikel auswählen
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                {#if articles.length > 0}
                  Durchsuche {articles.length.toLocaleString()} authentische Zeitungsartikel nach Titel oder Ressort
                {:else if isLoading}
                  Datensatz wird vorbereitet...
                {:else}
                  Keine Artikel geladen
                {/if}
              </p>
            </div>
          </div>

          <button
            type="button"
            class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-lg leading-none cursor-pointer transition-colors"
            on:click={onClose}
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>

        <!-- Search Bar Input -->
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <input
            bind:this={searchInput}
            type="text"
            bind:value={searchQuery}
            placeholder="Titel, Stichwort oder Artikelnummer suchen (z.B. Wien, Sport, #42)..."
            class="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
          {#if searchQuery}
            <button
              type="button"
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              on:click={() => searchQuery = ''}
            >
              ✕
            </button>
          {/if}
        </div>

        <!-- Category Pills Bar -->
        {#if categories.length > 2}
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {#each categories as cat}
              <button
                type="button"
                class="px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer {selectedCategory === cat 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'}"
                on:click={() => selectedCategory = cat}
              >
                {cat}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Results Count Bar -->
      <div class="px-5 py-2 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
        <span>
          {searchResults.length} {searchResults.length === 1 ? 'Artikel' : 'Artikel'} gefunden
          {#if selectedCategory !== 'Alle'} in „{selectedCategory}“{/if}
        </span>
        <span class="hidden sm:inline">Klicke auf einen Artikel zum Öffnen</span>
      </div>

      <!-- Articles List -->
      <div class="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
        {#if isLoading}
          <div class="py-12 text-center space-y-3">
            <svg class="animate-spin h-6 w-6 text-indigo-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="text-xs text-slate-500 dark:text-slate-400">Lade 10kGNAD Datensatz...</p>
          </div>
        {:else if searchResults.length === 0}
          <div class="py-12 text-center space-y-2">
            <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">Keine Artikel gefunden</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Versuche einen anderen Suchbegriff oder wähle eine andere Kategorie.
            </p>
            {#if searchQuery || selectedCategory !== 'Alle'}
              <button
                type="button"
                class="mt-2 inline-flex text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                on:click={() => { searchQuery = ''; selectedCategory = 'Alle'; }}
              >
                Filter zurücksetzen
              </button>
            {/if}
          </div>
        {:else}
          {#each searchResults as item (item.index)}
            {@const isCurrent = currentArticleNum === item.index}
            <button
              type="button"
              class="w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer group {isCurrent
                ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800'
                : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}"
              on:click={() => handleSelect(item.index)}
            >
              <div class="flex items-start justify-between gap-2 mb-1.5">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    #{item.index}
                  </span>
                  <span class="text-[10px] font-semibold px-2 py-0.5 rounded-md border {getCategoryColor(item.article.category)}">
                    {item.article.category}
                  </span>
                  <span class="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    {item.article.wordCount} Wörter
                  </span>
                </div>

                {#if isCurrent}
                  <span class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded bg-indigo-100/70 dark:bg-indigo-900/50">
                    Geöffnet
                  </span>
                {/if}
              </div>

              <h4 class="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug line-clamp-2">
                {item.title}
              </h4>

              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                {item.article.text.replace(/^[^\n]+\n+/, '').slice(0, 180)}...
              </p>
            </button>
          {/each}
        {/if}
      </div>

      <!-- Footer -->
      <div class="p-3 sm:px-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between text-xs">
        <span class="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
          Tipp: Seed wird standardmäßig auf 0 gesetzt
        </span>
        <button
          type="button"
          class="px-3.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer transition-colors"
          on:click={onClose}
        >
          Schließen
        </button>
      </div>
    </div>
  </div>
{/if}
