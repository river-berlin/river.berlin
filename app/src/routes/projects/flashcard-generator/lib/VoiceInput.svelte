<script lang="ts">
  import { onDestroy } from 'svelte';

  export let onAudioRecorded: (base64Audio: string, mimeType: string) => void = () => {};
  export let disabled = false;

  let isRecording = false;
  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: Blob[] = [];
  let recordSeconds = 0;
  let recordTimer: any = null;
  let errorMessage: string | null = null;

  onDestroy(() => {
    stopRecording(false);
  });

  async function startRecording() {
    if (disabled || isRecording) return;
    errorMessage = null;
    audioChunks = [];
    recordSeconds = 0;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        errorMessage = 'Mikrofon im Browser nicht unterstützt.';
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine supported mime type
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      }

      mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());

        if (audioChunks.length === 0) return;
        const audioBlob = new Blob(audioChunks, { type: mimeType });

        // Convert blob to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          if (base64String) {
            onAudioRecorded(base64String, mimeType);
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start(250);
      isRecording = true;

      recordTimer = setInterval(() => {
        recordSeconds++;
      }, 1000);
    } catch (err: any) {
      console.warn('Mikrofonfehler:', err);
      errorMessage = 'Mikrofonzugriff verweigert oder nicht verfügbar.';
      isRecording = false;
    }
  }

  function stopRecording(send = true) {
    if (recordTimer) {
      clearInterval(recordTimer);
      recordTimer = null;
    }

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      if (!send) {
        audioChunks = [];
      }
      mediaRecorder.stop();
    }
    isRecording = false;
  }

  function formatTime(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }
</script>

<div class="flex items-center gap-2 text-xs">
  {#if !isRecording}
    <button
      type="button"
      class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all active:scale-95 shadow-2xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 disabled:opacity-50 cursor-pointer"
      on:click={startRecording}
      {disabled}
      title="Sprachaufnahme starten und direkt an Gemini senden"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15a3 3 0 003-3V6a3 3 0 00-6 0v6a3 3 0 003 3z" />
      </svg>
      <span>🎙️ Audio aufnehmen</span>
    </button>
  {:else}
    <!-- Recording in Progress: Stop button -->
    <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-200 animate-pulse">
      <span class="inline-block w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span>
      <span class="font-bold">Aufnahme läuft ({formatTime(recordSeconds)})</span>

      <button
        type="button"
        class="ml-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shadow-xs active:scale-95 cursor-pointer"
        on:click={() => stopRecording(true)}
      >
        Fertig & Senden ✓
      </button>

      <button
        type="button"
        class="text-slate-400 hover:text-slate-600 text-xs px-1"
        on:click={() => stopRecording(false)}
        title="Abbrechen"
      >
        ✕
      </button>
    </div>
  {/if}

  {#if errorMessage}
    <span class="text-[11px] text-rose-500 font-semibold">{errorMessage}</span>
  {/if}
</div>
