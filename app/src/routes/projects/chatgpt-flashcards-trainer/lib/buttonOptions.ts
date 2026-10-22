import type { CaseExercise } from './types';

export interface SingleButtonGroup {
  type: 'single';
  group1Title: string;
  group1: string[];
  target1: string;
}

export interface TwoPartButtonGroup {
  type: 'two-part';
  group1Title: string;
  group1: string[];
  group2Title: string;
  group2: string[];
  target1: string;
  target2: string;
}

export type DeterminerButtonGroupResult = SingleButtonGroup | TwoPartButtonGroup;

const POSS_STEMS = ['mein', 'dein', 'sein', 'ihr', 'unser', 'euer'];

export function getDeterminerButtonGroups(exercise: CaseExercise): DeterminerButtonGroupResult {
  const words = (exercise.targetAnswer || '').trim().split(/\s+/).map(w => w.toLowerCase());
  const w0 = words[0] || '';
  const w1 = words[1] || '';

  // 1. Two-part: ein + solch- (e.g. "ein solcher", "einem solchen")
  if (words.length >= 3 && w1.startsWith('solch') && ['ein', 'eine', 'einen', 'einem', 'einer', 'eines'].includes(w0)) {
    return {
      type: 'two-part',
      group1Title: 'Artikel',
      group1: ['ein', 'eine', 'einen', 'einem', 'einer', 'eines'],
      group2Title: 'Form von solch-',
      group2: ['solcher', 'solche', 'solches', 'solchem', 'solchen'],
      target1: w0,
      target2: w1
    };
  }

  // Two-part: solch + ein (e.g. "solch ein Freund")
  if (words.length >= 3 && w0.startsWith('solch') && ['ein', 'eine', 'einen', 'einem', 'einer', 'eines'].includes(w1)) {
    return {
      type: 'two-part',
      group1Title: 'Form von solch-',
      group1: ['solch', 'solcher', 'solche', 'solches', 'solchem', 'solchen'],
      group2Title: 'Artikel',
      group2: ['ein', 'eine', 'einen', 'einem', 'einer', 'eines'],
      target1: w0,
      target2: w1
    };
  }

  // 2. Two-part: ein + ander- (e.g. "einen anderen", "ein anderer")
  if (words.length >= 3 && w1.startsWith('ander') && ['ein', 'eine', 'einen', 'einem', 'einer', 'eines'].includes(w0)) {
    return {
      type: 'two-part',
      group1Title: 'Artikel',
      group1: ['ein', 'eine', 'einen', 'einem', 'einer', 'eines'],
      group2Title: 'Form von ander-',
      group2: ['anderer', 'andere', 'anderes', 'anderem', 'anderen'],
      target1: w0,
      target2: w1
    };
  }

  // 3. Single: solch- (e.g. "Solche Messe")
  if (w0.startsWith('solch')) {
    return {
      type: 'single',
      group1Title: 'Form von solch-',
      group1: ['solch', 'solcher', 'solche', 'solches', 'solchem', 'solchen'],
      target1: w0
    };
  }

  // 4. Single: ander- (e.g. "Anderer Regen")
  if (w0.startsWith('ander')) {
    return {
      type: 'single',
      group1Title: 'Form von ander-',
      group1: ['anderer', 'andere', 'anderes', 'anderem', 'anderen'],
      target1: w0
    };
  }

  // 5. Single: Bestimmter Artikel (der, die, das...)
  if (['der', 'die', 'das', 'den', 'dem', 'des'].includes(w0)) {
    return {
      type: 'single',
      group1Title: 'Bestimmter Artikel',
      group1: ['der', 'die', 'das', 'dem', 'den', 'des'],
      target1: w0
    };
  }

  // 6. Single: Negativartikel (kein, keine...)
  if (w0.startsWith('kein')) {
    return {
      type: 'single',
      group1Title: 'Negativartikel',
      group1: ['kein', 'keine', 'keinen', 'keinem', 'keiner', 'keines'],
      target1: w0
    };
  }

  // 7. Single: Demonstrativartikel (dieser, diese...)
  if (w0.startsWith('dies')) {
    return {
      type: 'single',
      group1Title: 'Demonstrativartikel',
      group1: ['dieser', 'diese', 'dieses', 'diesem', 'diesen'],
      target1: w0
    };
  }

  // 8. Single: Unbestimmter Artikel (ein, eine...)
  if (['ein', 'eine', 'einen', 'einem', 'einer', 'eines'].includes(w0)) {
    return {
      type: 'single',
      group1Title: 'Unbestimmter Artikel',
      group1: ['ein', 'eine', 'einen', 'einem', 'einer', 'eines'],
      target1: w0
    };
  }

  // 9. Single: Possessivartikel (mein-, dein-, sein-, ihr-, unser-, euer-)
  for (const stem of POSS_STEMS) {
    if (w0.startsWith(stem)) {
      const forms = stem === 'unser'
        ? ['unser', 'unsere', 'unseren', 'unserem', 'unserer', 'unseres']
        : stem === 'euer'
        ? ['euer', 'eure', 'euren', 'eurem', 'eurer', 'eures']
        : [stem, stem + 'e', stem + 'en', stem + 'em', stem + 'er', stem + 'es'];
      return {
        type: 'single',
        group1Title: `Possessivartikel (${stem}-)`,
        group1: forms,
        target1: w0
      };
    }
  }

  // Fallback
  return {
    type: 'single',
    group1Title: 'Auswahl',
    group1: [w0],
    target1: w0
  };
}
