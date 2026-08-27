<script lang="ts">
  import type { FeedbackAnnotation, AnnotationType } from './types';

  export let text: string = '';
  export let annotations: FeedbackAnnotation[] = [];

  let selectedAnnotation: FeedbackAnnotation | null = null;
  let activeTooltipId: string | null = null;

  interface TextSegment {
    text: string;
    isAnnotated: boolean;
    annotation?: FeedbackAnnotation;
    id: string;
  }

  // Define type-specific styling
  const typeConfig: Record<AnnotationType, {
    label: string;
    badgeBg: string;
    badgeText: string;
    underlineClass: string;
    bgClass: string;
    borderClass: string;
    icon: string;
  }> = {
    spelling: {
      label: 'Rechtschreibung',
      badgeBg: 'bg-rose-100 dark:bg-rose-950/60',
      badgeText: 'text-rose-700 dark:text-rose-300',
      underlineClass: 'decoration-rose-500 decoration-wavy underline decoration-2',
      bgClass: 'bg-rose-50/80 dark:bg-rose-900/25',
      borderClass: 'border-rose-400 dark:border-rose-700',
      icon: '✍️'
    },
    grammar: {
      label: 'Grammatik',
      badgeBg: 'bg-purple-100 dark:bg-purple-950/60',
      badgeText: 'text-purple-700 dark:text-purple-300',
      underlineClass: 'decoration-purple-500 decoration-wavy underline decoration-2',
      bgClass: 'bg-purple-50/80 dark:bg-purple-900/25',
      borderClass: 'border-purple-400 dark:border-purple-700',
      icon: '🧩'
    },
    word_choice: {
      label: 'Wortwahl / Idiomatik',
      badgeBg: 'bg-amber-100 dark:bg-amber-950/60',
      badgeText: 'text-amber-800 dark:text-amber-300',
      underlineClass: 'decoration-amber-500 decoration-dashed underline decoration-2',
      bgClass: 'bg-amber-50/80 dark:bg-amber-900/25',
      borderClass: 'border-amber-400 dark:border-amber-700',
      icon: '💬'
    },
    word_order: {
      label: 'Satzbau & Wortstellung',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60',
      badgeText: 'text-emerald-800 dark:text-emerald-300',
      underlineClass: 'decoration-emerald-500 decoration-wavy underline decoration-2',
      bgClass: 'bg-emerald-50/80 dark:bg-emerald-900/25',
      borderClass: 'border-emerald-400 dark:border-emerald-700',
      icon: '🔄'
    },
    content_logic: {
      label: 'Inhalt & Logik',
      badgeBg: 'bg-sky-100 dark:bg-sky-950/60',
      badgeText: 'text-sky-800 dark:text-sky-300',
      underlineClass: 'decoration-sky-500 decoration-dotted underline decoration-2',
      bgClass: 'bg-sky-50/80 dark:bg-sky-900/25',
      borderClass: 'border-sky-400 dark:border-sky-700',
      icon: '💡'
    }
  };

  /**
   * Parse text into segments by finding occurrences of annotation substrings
   */
  $: segments = buildSegments(text, annotations);

  function buildSegments(fullText: string, annList: FeedbackAnnotation[]): TextSegment[] {
    if (!fullText) return [];
    if (!annList || annList.length === 0) {
      return [{ text: fullText, isAnnotated: false, id: 'seg-0' }];
    }

    // Find all matches with their start and end indices in fullText
    interface Match {
      start: number;
      end: number;
      annotation: FeedbackAnnotation;
    }

    const matches: Match[] = [];

    for (let i = 0; i < annList.length; i++) {
      const ann = annList[i];
      if (!ann.originalText || !ann.originalText.trim()) continue;

      const needle = ann.originalText.trim();
      let pos = fullText.indexOf(needle);
      // If not exact match, try case-insensitive search
      if (pos === -1) {
        pos = fullText.toLowerCase().indexOf(needle.toLowerCase());
      }

      if (pos !== -1) {
        matches.push({
          start: pos,
          end: pos + needle.length,
          annotation: ann
        });
      }
    }

    // Sort matches by start position
    matches.sort((a, b) => a.start - b.start);

    // Remove overlapping matches (keep earlier/longer)
    const nonOverlapping: Match[] = [];
    let lastEnd = 0;
    for (const m of matches) {
      if (m.start >= lastEnd) {
        nonOverlapping.push(m);
        lastEnd = m.end;
      }
    }

    // Build segments
    const result: TextSegment[] = [];
    let currentIndex = 0;

    for (let i = 0; i < nonOverlapping.length; i++) {
      const m = nonOverlapping[i];
      if (m.start > currentIndex) {
        result.push({
          text: fullText.substring(currentIndex, m.start),
          isAnnotated: false,
          id: `seg-plain-${i}`
        });
      }

      result.push({
        text: fullText.substring(m.start, m.end),
        isAnnotated: true,
        annotation: m.annotation,
        id: `seg-ann-${i}`
      });

      currentIndex = m.end;
    }

    if (currentIndex < fullText.length) {
      result.push({
        text: fullText.substring(currentIndex),
        isAnnotated: false,
        id: `seg-plain-tail`
      });
    }

    return result;
  }

  function toggleTooltip(id: string, annotation: FeedbackAnnotation) {
    if (activeTooltipId === id) {
      activeTooltipId = null;
      selectedAnnotation = null;
    } else {
      activeTooltipId = id;
      selectedAnnotation = annotation;
    }
  }
</script>

<div class="space-y-3">
  <!-- Annotated Sentence Box -->
  <div class="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 leading-relaxed text-base transition-colors duration-200">
    <div class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-between">
      <span>Deine Antwort mit Hinweisen:</span>
      {#if annotations.length === 0}
        <span class="text-emerald-600 dark:text-emerald-400 font-medium normal-case flex items-center gap-1">
          <span>✨ Keine Sprachfehler gefunden</span>
        </span>
      {:else}
        <span class="text-slate-500 dark:text-slate-400 text-xs normal-case font-normal">
          Klicke auf unterstrichene Wörter für Tipps
        </span>
      {/if}
    </div>

    <div class="font-sans text-slate-800 dark:text-slate-100 text-base leading-loose select-text">
      {#each segments as seg (seg.id)}
        {#if seg.isAnnotated && seg.annotation}
          {@const conf = typeConfig[seg.annotation.type] || typeConfig.grammar}
          <span class="relative inline-block my-0.5 mx-0.5">
            <button
              type="button"
              class="px-1.5 py-0.5 rounded cursor-pointer transition-all duration-150 font-medium {conf.underlineClass} {conf.bgClass} hover:ring-2 hover:ring-offset-1 hover:ring-slate-400 dark:hover:ring-slate-600 focus:outline-none"
              on:click={() => seg.annotation && toggleTooltip(seg.id, seg.annotation)}
              aria-label="Hinweis für {seg.text}"
            >
              {seg.text}
            </button>

            <!-- Floating Tooltip Card -->
            {#if activeTooltipId === seg.id}
              <div 
                class="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 sm:w-80 p-3.5 rounded-xl shadow-xl bg-white dark:bg-slate-800 border {conf.borderClass} text-left text-xs space-y-2 animate-in fade-in zoom-in-95 duration-150"
              >
                <div class="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/80 pb-2">
                  <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-semibold {conf.badgeBg} {conf.badgeText}">
                    <span>{conf.icon}</span>
                    <span>{conf.label}</span>
                  </span>
                  <button 
                    type="button" 
                    class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-base leading-none p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                    on:click={() => activeTooltipId = null}
                    aria-label="Schließen"
                  >
                    ×
                  </button>
                </div>

                <!-- Socratic Hint -->
                {#if seg.annotation.hint}
                  <div class="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200">
                    <div class="font-bold text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1 mb-0.5">
                      <span>💡 Denkanstoß (Tipp):</span>
                    </div>
                    <p class="leading-snug">{seg.annotation.hint}</p>
                  </div>
                {/if}

                <!-- Linguistic Explanation -->
                {#if seg.annotation.explanation}
                  <div class="text-slate-600 dark:text-slate-300 space-y-1">
                    <div class="font-semibold text-slate-700 dark:text-slate-200">Erklärung:</div>
                    <p class="leading-relaxed">{seg.annotation.explanation}</p>
                  </div>
                {/if}
              </div>
            {/if}
          </span>
        {:else}
          <span>{seg.text}</span>
        {/if}
      {/each}
    </div>
  </div>

  <!-- Category Badges / Legend -->
  {#if annotations.length > 0}
    <div class="space-y-2">
      <div class="text-xs font-medium text-slate-500 dark:text-slate-400">Gefundene Lernschwerpunkte:</div>
      <div class="flex flex-wrap gap-2">
        {#each annotations as ann, idx (idx)}
          {@const conf = typeConfig[ann.type] || typeConfig.grammar}
          <div 
            class="flex items-start gap-2 p-2.5 rounded-lg border text-xs bg-white dark:bg-slate-800/90 shadow-sm {conf.borderClass}"
          >
            <span class="inline-flex items-center justify-center p-1 rounded-md shrink-0 {conf.badgeBg}">
              {conf.icon}
            </span>
            <div class="space-y-0.5">
              <div class="flex items-center gap-2">
                <span class="font-bold text-slate-900 dark:text-slate-100">»{ann.originalText}«</span>
                <span class="px-1.5 py-0.2 rounded text-[10px] font-semibold {conf.badgeBg} {conf.badgeText}">
                  {conf.label}
                </span>
              </div>
              <p class="text-slate-600 dark:text-slate-300 leading-snug">{ann.hint || ann.explanation}</p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
