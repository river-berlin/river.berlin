<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { generateSpeech } from './openrouter';

  export let text: string = '';
  export let label: string = 'Vorlesen';
  export let apiKey: string = '';

  let isSpeaking = false;
  let isPaused = false;
  let isLoadingAudio = false;
  let rate = 1.0; // Standard 1x tempo
  let germanVoice: SpeechSynthesisVoice | null = null;
  let audioElement: HTMLAudioElement | null = null;

  // Pipelined chunk streaming state
  let chunks: string[] = [];
  let currentChunkIndex = 0;
  let chunkAudioUrls = new Map<number, string>();
  let prefetchPromises = new Map<number, Promise<string>>();
  let isCancelled = false;
  let cachedText: string = '';

  onMount(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      findGermanVoice();
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = findGermanVoice;
      }
    }
  });

  onDestroy(() => {
    stop();
    cleanupUrls();
  });

  $: if (text !== cachedText) {
    cleanupUrls();
    cachedText = text;
    stop();
  }

  function cleanupUrls() {
    chunkAudioUrls.forEach((url) => URL.revokeObjectURL(url));
    chunkAudioUrls.clear();
    prefetchPromises.clear();
  }

  function findGermanVoice() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    germanVoice = voices.find(v => v.lang.startsWith('de') || v.lang.includes('German')) || null;
  }

  function splitIntoChunks(fullText: string): string[] {
    const paras = fullText.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
    if (paras.length > 0) return paras;
    return [fullText.trim()];
  }

  async function fetchChunkAudio(chunkIdx: number): Promise<string> {
    if (chunkAudioUrls.has(chunkIdx)) {
      return chunkAudioUrls.get(chunkIdx)!;
    }
    if (prefetchPromises.has(chunkIdx)) {
      return await prefetchPromises.get(chunkIdx)!;
    }

    const promise = (async () => {
      const chunkText = chunks[chunkIdx];
      const blob = await generateSpeech({
        apiKey: apiKey.trim(),
        model: 'google/gemini-3.7-flash',
        siteUrl: typeof window !== 'undefined' ? window.location.origin : 'https://river.berlin',
        siteName: 'river.berlin German Learning Helper'
      }, chunkText);
      const url = URL.createObjectURL(blob);
      chunkAudioUrls.set(chunkIdx, url);
      return url;
    })();

    prefetchPromises.set(chunkIdx, promise);
    return await promise;
  }

  async function speak() {
    if (!text) return;

    // If currently paused in HTML5 Audio or Web Speech
    if (isPaused) {
      if (audioElement) {
        audioElement.playbackRate = rate;
        audioElement.play();
      } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.resume();
      }
      isPaused = false;
      isSpeaking = true;
      return;
    }

    stop();
    isCancelled = false;

    // 1. Try Pipelined Gemini 3.1 Flash TTS if API key is provided
    if (apiKey && apiKey.trim()) {
      try {
        chunks = splitIntoChunks(text);
        currentChunkIndex = 0;
        await playChunk(0);
        return;
      } catch (err) {
        console.warn('Gemini TTS stream error, falling back to Web Speech API:', err);
      }
    }

    // 2. Fallback to Web Speech API
    speakWithWebSpeech();
  }

  async function playChunk(index: number) {
    if (isCancelled || index >= chunks.length) {
      isSpeaking = false;
      isPaused = false;
      isLoadingAudio = false;
      return;
    }

    currentChunkIndex = index;
    isLoadingAudio = !chunkAudioUrls.has(index);

    try {
      // Fetch current chunk
      const audioUrl = await fetchChunkAudio(index);
      if (isCancelled) return;

      isLoadingAudio = false;
      isSpeaking = true;
      isPaused = false;

      // Start prefetching next chunk in parallel while current chunk plays
      if (index + 1 < chunks.length) {
        fetchChunkAudio(index + 1).catch(() => {});
      }

      if (audioElement) {
        audioElement.pause();
      }

      audioElement = new Audio(audioUrl);
      audioElement.playbackRate = rate;

      audioElement.onended = () => {
        if (!isCancelled) {
          playChunk(index + 1);
        }
      };

      audioElement.onerror = () => {
        console.warn('Audio playback failed for chunk', index);
        if (!isCancelled) {
          playChunk(index + 1);
        }
      };

      await audioElement.play();
    } catch (err) {
      console.warn('Error loading chunk', index, err);
      if (index === 0) {
        // Fallback to Web Speech if first chunk failed
        speakWithWebSpeech();
      } else if (!isCancelled) {
        playChunk(index + 1);
      }
    } finally {
      isLoadingAudio = false;
    }
  }

  function speakWithWebSpeech() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE';
    utterance.rate = rate;
    if (germanVoice) {
      utterance.voice = germanVoice;
    }

    utterance.onstart = () => {
      isSpeaking = true;
      isPaused = false;
    };

    utterance.onend = () => {
      isSpeaking = false;
      isPaused = false;
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      isSpeaking = false;
      isPaused = false;
    };

    window.speechSynthesis.speak(utterance);
  }

  function pause() {
    if (audioElement && !audioElement.paused) {
      audioElement.pause();
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
    isPaused = true;
    isSpeaking = false;
  }

  function stop() {
    isCancelled = true;
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      audioElement = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    isSpeaking = false;
    isPaused = false;
    isLoadingAudio = false;
  }

  function handleRateChange() {
    if (audioElement) {
      audioElement.playbackRate = rate;
    }
  }
</script>

<div class="inline-flex items-center gap-2 flex-wrap text-xs">
  {#if !isSpeaking && !isLoadingAudio}
    <button
      type="button"
      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-semibold transition-all border border-slate-200 dark:border-slate-700 active:scale-95 shadow-xs"
      on:click={speak}
      title="Text vorlesen"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z"/>
      </svg>
      <span>{label}</span>
    </button>
  {:else if isLoadingAudio}
    <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-200 dark:border-indigo-800 text-xs">
      <svg class="animate-spin h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>Starte Audio...</span>
    </div>
  {:else}
    <button
      type="button"
      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 font-semibold transition-all border border-amber-300 dark:border-amber-800"
      on:click={pause}
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
      </svg>
      <span>Pause</span>
    </button>
    <button
      type="button"
      class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs"
      on:click={stop}
      title="Stoppen"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 6h12v12H6z"/>
      </svg>
      <span>Stopp</span>
    </button>
  {/if}

  <!-- Tempo Selector (Default 1.0x) -->
  <div class="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
    <span>Tempo:</span>
    <select
      bind:value={rate}
      class="bg-transparent font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
      on:change={handleRateChange}
    >
      <option value={0.75}>0.75x</option>
      <option value={1.0}>1.0x (Standard)</option>
      <option value={1.25}>1.25x</option>
      <option value={1.5}>1.5x</option>
    </select>
  </div>
</div>
