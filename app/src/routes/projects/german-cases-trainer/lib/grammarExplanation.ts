import type { CaseExercise } from './types';

export interface GrammarBreakdown {
  genderLine: string;
  caseLine: string;
  patternTitle: string;
  patternDetails: string[];
}

export function getDetailedGrammarExplanation(ex: CaseExercise): GrammarBreakdown {
  const g = ex.gender || 'm';
  const c = ex.case || 'nominativ';
  const group = ex.determinerGroup || 'def';
  const noun = ex.baseNoun;

  const genderNames = { m: 'Maskulinum', f: 'Femininum', n: 'Neutrum', pl: 'Plural' };
  const baseArticles = { m: 'der', f: 'die', n: 'das', pl: 'die' };
  const caseNames = { nominativ: 'Nominativ', akkusativ: 'Akkusativ', dativ: 'Dativ', genitiv: 'Genitiv' };

  const gName = genderNames[g] || 'Maskulinum';
  const bArt = baseArticles[g] || 'der';
  const cName = caseNames[c] || 'Nominativ';

  const genderLine = `Nomen & Genus: „${noun}“ ist ${gName} (${bArt} ${noun}).`;

  let caseLine = '';
  if (c === 'nominativ') {
    caseLine = `Fall: Das Nomen ist das Subjekt des Satzes und steht im Nominativ (Wer-Fall).`;
  } else if (c === 'akkusativ') {
    caseLine = `Fall: Das Nomen ist das direkte Objekt des Verbs und steht im Akkusativ (Wen-Fall).`;
  } else if (c === 'dativ') {
    caseLine = `Fall: Das Nomen steht nach der Präposition oder dem Verb im Dativ (Wem-Fall).`;
  } else {
    caseLine = `Fall: Das Nomen drückt ein Besitz- oder Zugehörigkeitsverhältnis aus (Genitiv / Wessen-Fall).`;
  }

  let patternTitle = '';
  const patternDetails: string[] = [];

  if (group === 'solch' || group === 'ander') {
    const wordBase = group === 'solch' ? 'solch-' : 'ander-';
    patternTitle = `Warum 2 Wörter und wie sich jedes Wort verändert:`;

    if (g === 'n' && (c === 'nominativ' || c === 'akkusativ')) {
      patternDetails.push(`Wort 1 (Artikel): Der unbestimmte Artikel für Neutrum im ${cName} bleibt „ein“ (ohne Endung).`);
      patternDetails.push(`Wort 2 (Begleiter): Da „ein“ keine Geschlechtsendung hat, muss „${wordBase}“ das Neutrum mit der starken Endung „-es“ signalisieren ➔ „${group === 'solch' ? 'ein solches' : 'ein anderes'} ${noun}“.`);
    } else if (g === 'm' && c === 'nominativ') {
      patternDetails.push(`Wort 1 (Artikel): Der unbestimmte Artikel für Maskulinum im Nominativ bleibt „ein“ (ohne Endung).`);
      patternDetails.push(`Wort 2 (Begleiter): Da „ein“ keine Endung hat, signalisiert „${wordBase}“ das Maskulinum mit der starken Endung „-er“ ➔ „${group === 'solch' ? 'ein solcher' : 'ein anderer'} ${noun}“.`);
    } else if (g === 'm' && c === 'akkusativ') {
      patternDetails.push(`Wort 1 (Artikel): Der unbestimmte Artikel erhält im Akkusativ Maskulinum die Endung „-en“ ➔ „einen“.`);
      patternDetails.push(`Wort 2 (Begleiter): Nach „einen“ bekommt das nachfolgende Wort im Akkusativ Maskulinum die schwache Endung „-en“ ➔ „${group === 'solch' ? 'einen solchen' : 'einen anderen'} ${noun}“.`);
    } else if ((g === 'm' || g === 'n') && c === 'dativ') {
      patternDetails.push(`Wort 1 (Artikel): Der unbestimmte Artikel erhält im Dativ (${gName}) die Endung „-em“ ➔ „einem“.`);
      patternDetails.push(`Wort 2 (Begleiter): Im Dativ erhalten nachgestellte Wörter nach „einem“ immer die Endung „-en“ ➔ „${group === 'solch' ? 'einem solchen' : 'einem anderen'} ${noun}“.`);
    } else if (g === 'f' && (c === 'nominativ' || c === 'akkusativ')) {
      patternDetails.push(`Wort 1 (Artikel): Der unbestimmte Artikel für Femininum ist „eine“.`);
      patternDetails.push(`Wort 2 (Begleiter): Nach „eine“ erhält „${wordBase}“ die Endung „-e“ ➔ „${group === 'solch' ? 'eine solche' : 'eine andere'} ${noun}“.`);
    } else if (g === 'f' && c === 'dativ') {
      patternDetails.push(`Wort 1 (Artikel): Der unbestimmte Artikel für Femininum im Dativ ist „einer“.`);
      patternDetails.push(`Wort 2 (Begleiter): Im Dativ erhalten nachgestellte Wörter nach „einer“ immer die Endung „-en“ ➔ „${group === 'solch' ? 'einer solchen' : 'einer anderen'} ${noun}“.`);
    }
  } else if (group === 'dies') {
    patternTitle = `Demonstrativpronomen „dies-“:`;
    if (g === 'n' && (c === 'nominativ' || c === 'akkusativ')) {
      patternDetails.push(`Im ${cName} Neutrum nimmt „dies-“ die starke Endung „-es“ (analog zu „das“) an ➔ „dieses ${noun}“ (nicht „dieser“, was Maskulinum wäre).`);
    } else if (g === 'm' && c === 'nominativ') {
      patternDetails.push(`Im Nominativ Maskulinum nimmt „dies-“ die Endung „-er“ (analog zu „der“) an ➔ „dieser ${noun}“ (nicht „dieses“, was Neutrum wäre).`);
    } else if (g === 'm' && c === 'akkusativ') {
      patternDetails.push(`Im Akkusativ Maskulinum nimmt „dies-“ die Endung „-en“ (analog zu „den“) an ➔ „diesen ${noun}“.`);
    } else if ((g === 'm' || g === 'n') && c === 'dativ') {
      patternDetails.push(`Im Dativ (${gName}) nimmt „dies-“ die Endung „-em“ (analog zu „dem“) an ➔ „diesem ${noun}“.`);
    } else if (g === 'f' && (c === 'nominativ' || c === 'akkusativ')) {
      patternDetails.push(`Im ${cName} Femininum nimmt „dies-“ die Endung „-e“ (analog zu „die“) an ➔ „diese ${noun}“.`);
    } else if (g === 'f' && c === 'dativ') {
      patternDetails.push(`Im Dativ Femininum nimmt „dies-“ die Endung „-er“ (analog zu „der“) an ➔ „dieser ${noun}“.`);
    } else if (g === 'pl') {
      if (c === 'dativ') {
        patternDetails.push(`Im Dativ Plural nimmt „dies-“ die Endung „-en“ (analog zu „den“) an ➔ „diesen ${noun}“.`);
      } else {
        patternDetails.push(`Im ${cName} Plural nimmt „dies-“ die Endung „-e“ (analog zu „die“) an ➔ „diese ${noun}“.`);
      }
    }
  } else if (group === 'poss') {
    patternTitle = `Possessivbegleiter „mein-“:`;
    if (g === 'm' && c === 'nominativ') {
      patternDetails.push(`Im Nominativ Maskulinum bleibt „mein“ endungslos ➔ „mein ${noun}“.`);
    } else if (g === 'm' && c === 'akkusativ') {
      patternDetails.push(`Im Akkusativ Maskulinum erhält „mein“ die Endung „-en“ ➔ „meinen ${noun}“.`);
    } else if ((g === 'm' || g === 'n') && c === 'dativ') {
      patternDetails.push(`Im Dativ (${gName}) erhält „mein“ die Endung „-em“ ➔ „meinem ${noun}“.`);
    } else if (g === 'n' && (c === 'nominativ' || c === 'akkusativ')) {
      patternDetails.push(`Im ${cName} Neutrum bleibt „mein“ endungslos ➔ „mein ${noun}“.`);
    } else if (g === 'f' && (c === 'nominativ' || c === 'akkusativ')) {
      patternDetails.push(`Im ${cName} Femininum erhält „mein“ die Endung „-e“ ➔ „meine ${noun}“.`);
    } else if (g === 'f' && c === 'dativ') {
      patternDetails.push(`Im Dativ Femininum erhält „mein“ die Endung „-er“ ➔ „meiner ${noun}“.`);
    } else if (g === 'pl') {
      if (c === 'dativ') {
        patternDetails.push(`Im Dativ Plural erhält „mein-“ die Endung „-en“ ➔ „meinen ${noun}“.`);
      } else {
        patternDetails.push(`Im ${cName} Plural erhält „mein-“ die Endung „-e“ ➔ „meine ${noun}“.`);
      }
    }
  } else if (group === 'kein') {
    patternTitle = `Negationsartikel „kein-“:`;
    if (g === 'm' && c === 'nominativ') {
      patternDetails.push(`Im Nominativ Maskulinum bleibt „kein“ endungslos ➔ „kein ${noun}“.`);
    } else if (g === 'm' && c === 'akkusativ') {
      patternDetails.push(`Im Akkusativ Maskulinum erhält „kein“ die Endung „-en“ ➔ „keinen ${noun}“.`);
    } else if ((g === 'm' || g === 'n') && c === 'dativ') {
      patternDetails.push(`Im Dativ (${gName}) erhält „kein“ die Endung „-em“ ➔ „keinem ${noun}“.`);
    } else if (g === 'n' && (c === 'nominativ' || c === 'akkusativ')) {
      patternDetails.push(`Im ${cName} Neutrum bleibt „kein“ endungslos ➔ „kein ${noun}“.`);
    } else if (g === 'f' && (c === 'nominativ' || c === 'akkusativ')) {
      patternDetails.push(`Im ${cName} Femininum erhält „kein“ die Endung „-e“ ➔ „keine ${noun}“.`);
    } else if (g === 'f' && c === 'dativ') {
      patternDetails.push(`Im Dativ Femininum erhält „kein“ die Endung „-er“ ➔ „keiner ${noun}“.`);
    } else if (g === 'pl') {
      if (c === 'dativ') {
        patternDetails.push(`Im Dativ Plural erhält „kein-“ die Endung „-en“ ➔ „keinen ${noun}“.`);
      } else {
        patternDetails.push(`Im ${cName} Plural erhält „kein-“ die Endung „-e“ ➔ „keine ${noun}“.`);
      }
    }
  } else if (group === 'def') {
    patternTitle = `Bestimmter Artikel:`;
    const targetArt = ex.targetAnswer.trim().split(/\s+/)[0];
    patternDetails.push(`Der bestimmte Artikel für ${gName} im ${cName} lautet „${targetArt}“ ➔ „${ex.targetAnswer}“.`);
  } else if (group === 'indef') {
    patternTitle = `Unbestimmter Artikel:`;
    if (g === 'pl') {
      patternDetails.push(`Im Plural gibt es keinen unbestimmten Artikel („ein-“). Stattdessen steht der Nullartikel, ein Possessiv oder „einige“ ➔ „${ex.targetAnswer}“.`);
    } else {
      const targetArt = ex.targetAnswer.trim().split(/\s+/)[0];
      patternDetails.push(`Der unbestimmte Artikel für ${gName} im ${cName} lautet „${targetArt}“ ➔ „${ex.targetAnswer}“.`);
    }
  }

  return {
    genderLine,
    caseLine,
    patternTitle,
    patternDetails
  };
}
