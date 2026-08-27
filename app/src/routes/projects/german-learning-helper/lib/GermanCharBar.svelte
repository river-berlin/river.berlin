<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{
    insert: string;
  }>();

  const specialChars = ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'];

  function handleInsert(char: string) {
    dispatch('insert', char);
  }
</script>

<div class="flex items-center gap-1.5 flex-wrap">
  <span class="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none mr-1">
    Sonderzeichen:
  </span>
  {#each specialChars as char}
    <button
      type="button"
      class="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 active:scale-95 transition-all"
      on:click={() => handleInsert(char)}
      title="Einfügen: {char}"
    >
      {char}
    </button>
  {/each}
</div>
