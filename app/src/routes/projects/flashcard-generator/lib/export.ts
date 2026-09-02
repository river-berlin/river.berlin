import type { Flashcard } from './types';

/**
 * Escapes a field for Reword CSV:
 * Doubles all internal quotes (" -> "") and removes newlines
 */
function escapeRewordField(val?: string): string {
  if (!val) return '';
  return val.replace(/"/g, '""').replace(/\r\n/g, ' ').replace(/\n/g, ' ').trim();
}

/**
 * Generates Reword-compatible semicolon-delimited CSV string
 */
export function generateRewordCsvString(cards: Flashcard[]): string {
  const rows = cards.map((card) => {
    const f1 = escapeRewordField(card.face1);
    const det = escapeRewordField(card.details);
    const f2 = escapeRewordField(card.face2);
    const s1 = escapeRewordField(card.sentence1);
    const s1d = escapeRewordField(card.sentence1_detail);
    const s2 = escapeRewordField(card.sentence2 || '');
    const s2d = escapeRewordField(card.sentence2_detail || '');
    const s3 = escapeRewordField(card.sentence3 || '');
    const s3d = escapeRewordField(card.sentence3_detail || '');

    if (s3 || s3d) {
      return `"${f1}";"${det}";"${f2}";"${s1}";"${s1d}";"${s2}";"${s2d}";"${s3}";"${s3d}"`;
    }
    return `"${f1}";"${det}";"${f2}";"${s1}";"${s1d}";"${s2}";"${s2d}"`;
  });

  return rows.join('\r\n');
}

/**
 * Exports flashcards as a downloadable Reword CSV file (with UTF-8 BOM)
 */
export function downloadRewordCsv(cards: Flashcard[], filename = 'reword_german_cards.csv'): void {
  if (cards.length === 0) return;
  const content = '\uFEFF' + generateRewordCsvString(cards);
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

/**
 * Copies Reword CSV format to clipboard
 */
export async function copyRewordToClipboard(cards: Flashcard[]): Promise<boolean> {
  if (cards.length === 0 || typeof navigator === 'undefined' || !navigator.clipboard) return false;
  try {
    const content = generateRewordCsvString(cards);
    await navigator.clipboard.writeText(content);
    return true;
  } catch (e) {
    console.warn('Clipboard write failed:', e);
    return false;
  }
}

/**
 * Generates Anki-compatible TSV string (Front \t Back \t Details \t Examples)
 */
export function generateAnkiTsvString(cards: Flashcard[]): string {
  const rows = cards.map((card) => {
    const cleanF1 = (card.face1 || '').replace(/\t/g, ' ').replace(/\n/g, ' ');
    const cleanF2 = (card.face2 || '').replace(/\t/g, ' ').replace(/\n/g, ' ');
    const cleanDet = (card.details || '').replace(/\t/g, ' ').replace(/\n/g, ' ');
    
    let examples = `${card.sentence1} — ${card.sentence1_detail}`;
    if (card.sentence2) {
      examples += `<br>${card.sentence2} — ${card.sentence2_detail || ''}`;
    }
    if (card.sentence3) {
      examples += `<br>${card.sentence3} — ${card.sentence3_detail || ''}`;
    }
    examples = examples.replace(/\t/g, ' ');

    return `${cleanF1}\t${cleanF2}\t${cleanDet}\t${examples}`;
  });

  return rows.join('\n');
}

/**
 * Exports flashcards as an Anki-compatible TSV file
 */
export function downloadAnkiTsv(cards: Flashcard[], filename = 'anki_german_cards.tsv'): void {
  if (cards.length === 0) return;
  const content = generateAnkiTsvString(cards);
  const blob = new Blob([content], { type: 'text/tab-separated-values;charset=utf-8;' });
  downloadBlob(blob, filename);
}

/**
 * Copies Anki TSV format to clipboard
 */
export async function copyAnkiToClipboard(cards: Flashcard[]): Promise<boolean> {
  if (cards.length === 0 || typeof navigator === 'undefined' || !navigator.clipboard) return false;
  try {
    const content = generateAnkiTsvString(cards);
    await navigator.clipboard.writeText(content);
    return true;
  } catch (e) {
    console.warn('Clipboard write failed:', e);
    return false;
  }
}

/**
 * Exports cards as JSON
 */
export function downloadJson(cards: Flashcard[], filename = 'german_cards.json'): void {
  if (cards.length === 0) return;
  const content = JSON.stringify(cards, null, 2);
  const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
  downloadBlob(blob, filename);
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
