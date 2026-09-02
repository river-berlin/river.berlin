import { writable } from 'svelte/store';
import type { FlashcardItem } from './types';

const STORAGE_KEY_FLASHCARDS = 'german_helper_flashcards_v1';

function createFlashcardsStore() {
  const initialData: FlashcardItem[] = [];
  const { subscribe, set, update } = writable<FlashcardItem[]>(initialData);

  function loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_FLASHCARDS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          set(parsed);
        }
      }
    } catch (e) {
      console.warn('Fehler beim Laden der Flashcards:', e);
    }
  }

  function saveToStorage(items: FlashcardItem[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_FLASHCARDS, JSON.stringify(items));
    } catch (e) {
      console.warn('Fehler beim Speichern der Flashcards:', e);
    }
  }

  return {
    subscribe,
    init: loadFromStorage,
    add: (item: Omit<FlashcardItem, 'id' | 'addedAt'>) => {
      update((items) => {
        // Prevent duplicate german word entries
        const existingIdx = items.findIndex(
          (i) => i.german.trim().toLowerCase() === item.german.trim().toLowerCase()
        );
        let updated: FlashcardItem[];
        if (existingIdx !== -1) {
          // Update existing item with latest translation / explanation
          updated = items.map((i, idx) =>
            idx === existingIdx ? { ...i, ...item, addedAt: Date.now() } : i
          );
        } else {
          const newItem: FlashcardItem = {
            ...item,
            id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            addedAt: Date.now()
          };
          updated = [newItem, ...items];
        }
        saveToStorage(updated);
        return updated;
      });
    },
    remove: (id: string) => {
      update((items) => {
        const updated = items.filter((i) => i.id !== id);
        saveToStorage(updated);
        return updated;
      });
    },
    removeByGerman: (german: string) => {
      update((items) => {
        const updated = items.filter(
          (i) => i.german.trim().toLowerCase() !== german.trim().toLowerCase()
        );
        saveToStorage(updated);
        return updated;
      });
    },
    clearAll: () => {
      set([]);
      saveToStorage([]);
    }
  };
}

export const flashcards = createFlashcardsStore();

/**
 * Escapes a string for Reword semicolon-delimited CSV:
 * Replaces double quotes with doubled double quotes (" -> "") and cleans up internal newlines
 */
function escapeRewordField(val: string): string {
  if (!val) return '';
  return val.replace(/"/g, '""').replace(/\r\n/g, ' ').replace(/\n/g, ' ').trim();
}

/**
 * Exports flashcards to Reword-compatible semicolon-delimited UTF-8 CSV:
 * Format: "face1";"details";"face2";"sentence1";"sentence1_detail";"sentence2";"sentence2_detail"
 */
export function exportToRewordCsv(items: FlashcardItem[]): void {
  if (items.length === 0) return;

  const rows = items.map((item) => {
    const face1 = escapeRewordField(item.german);
    const details = escapeRewordField(item.explanation || '');
    const face2 = escapeRewordField(item.translation || '');
    const sentence1 = escapeRewordField(item.contextSentence || '');
    const sentence1Detail = ''; // expansion/translation of sentence 1

    return `"${face1}";"${details}";"${face2}";"${sentence1}";"${sentence1Detail}"`;
  });

  // Include UTF-8 BOM (\uFEFF) for immediate compatibility with Android/Windows CSV parsers
  const content = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `reword_german_${formatDate(new Date())}.csv`);
}

/**
 * Copies flashcards to clipboard in Reword CSV format
 */
export async function copyRewordToClipboard(items: FlashcardItem[]): Promise<boolean> {
  if (items.length === 0 || typeof navigator === 'undefined' || !navigator.clipboard) return false;

  const rows = items.map((item) => {
    const face1 = escapeRewordField(item.german);
    const details = escapeRewordField(item.explanation || '');
    const face2 = escapeRewordField(item.translation || '');
    const sentence1 = escapeRewordField(item.contextSentence || '');
    const sentence1Detail = '';
    return `"${face1}";"${details}";"${face2}";"${sentence1}";"${sentence1Detail}"`;
  });

  try {
    await navigator.clipboard.writeText(rows.join('\n'));
    return true;
  } catch (e) {
    console.warn('Clipboard write failed:', e);
    return false;
  }
}

/**
 * Exports flashcards to Anki-compatible TSV format (Tab-separated)
 */
export function exportToAnkiTsv(items: FlashcardItem[]): void {
  if (items.length === 0) return;

  // Format: Front (German) \t Back (English) \t Notes / Explanation \t Example Sentence
  const rows = items.map((item) => {
    const cleanGerman = item.german.replace(/\t/g, ' ').replace(/\n/g, ' ');
    const cleanTranslation = (item.translation || '').replace(/\t/g, ' ').replace(/\n/g, ' ');
    const cleanExplanation = (item.explanation || '').replace(/\t/g, ' ').replace(/\n/g, ' ');
    const cleanContext = (item.contextSentence || '').replace(/\t/g, ' ').replace(/\n/g, ' ');
    return `${cleanGerman}\t${cleanTranslation}\t${cleanExplanation}\t${cleanContext}`;
  });

  const content = rows.join('\n');
  const blob = new Blob([content], { type: 'text/tab-separated-values;charset=utf-8;' });
  downloadBlob(blob, `anki_german_${formatDate(new Date())}.tsv`);
}

/**
 * Copies flashcards to clipboard in Anki-ready TSV format
 */
export async function copyFlashcardsToClipboard(items: FlashcardItem[]): Promise<boolean> {
  if (items.length === 0 || typeof navigator === 'undefined' || !navigator.clipboard) return false;

  const rows = items.map((item) => {
    const cleanGerman = item.german.replace(/\t/g, ' ').replace(/\n/g, ' ');
    const cleanTranslation = (item.translation || '').replace(/\t/g, ' ').replace(/\n/g, ' ');
    const cleanExplanation = (item.explanation || '').replace(/\t/g, ' ').replace(/\n/g, ' ');
    const cleanContext = (item.contextSentence || '').replace(/\t/g, ' ').replace(/\n/g, ' ');
    return `${cleanGerman}\t${cleanTranslation}\t${cleanExplanation}\t${cleanContext}`;
  });

  try {
    await navigator.clipboard.writeText(rows.join('\n'));
    return true;
  } catch (e) {
    console.warn('Clipboard write failed:', e);
    return false;
  }
}

/**
 * Exports flashcards as JSON
 */
export function exportToJson(items: FlashcardItem[]): void {
  if (items.length === 0) return;
  const content = JSON.stringify(items, null, 2);
  const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
  downloadBlob(blob, `german_learning_flashcards_${formatDate(new Date())}.json`);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}
