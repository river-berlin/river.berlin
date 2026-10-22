import type { CaseExercise } from './types';

export interface GrammarBreakdown {
  genderLine: string;
  caseLine: string;
  caseName: string;
  whyCaseReason: string;
  patternTitle: string;
  patternDetails: string[];
}

export function getWhyCaseReason(c: string, start: string, full: string): string {
  const s = (start || '').trim();
  const lowerFull = (full || '').toLowerCase();

  const lastWordMatch = s.match(/([a-zA-ZäöüÄÖÜß]+)[^a-zA-ZäöüÄÖÜß]*$/);
  const lastWord = lastWordMatch ? lastWordMatch[1].toLowerCase() : '';
  const firstWord = (s.split(/\s+/)[0] || '').toLowerCase();

  if (c === 'dativ') {
    // 1. Dativ Prepositions (Always Dativ)
    const dativPreps: Record<string, string> = {
      mit: 'Präposition „mit“ (Die Präposition „mit“ fordert im Deutschen ausnahmslos den Dativ).',
      bei: 'Präposition „bei“ (Die Präposition „bei“ fordert immer den Dativ).',
      beim: 'Präposition „bei“ (in „beim“ verschmolzen; fordert immer den Dativ).',
      zu: 'Präposition „zu“ (Die Präposition „zu“ fordert immer den Dativ).',
      zum: 'Präposition „zu“ (in „zum“ verschmolzen; fordert immer den Dativ).',
      zur: 'Präposition „zu“ (in „zur“ verschmolzen; fordert immer den Dativ).',
      nach: 'Präposition „nach“ (Die Präposition „nach“ fordert immer den Dativ).',
      aus: 'Präposition „aus“ (Die Präposition „aus“ fordert immer den Dativ).',
      von: 'Präposition „von“ (Die Präposition „von“ fordert immer den Dativ).',
      vom: 'Präposition „von“ (in „vom“ verschmolzen; fordert immer den Dativ).',
      seit: 'Präposition „seit“ (Die Zeitpräposition „seit“ fordert immer den Dativ).',
      ab: 'Präposition „ab“ (Die Präposition „ab“ fordert immer den Dativ).',
      außer: 'Präposition „außer“ (Die Präposition „außer“ fordert immer den Dativ).',
      gegenüber: 'Präposition „gegenüber“ (Die Präposition „gegenüber“ fordert immer den Dativ).',
      dank: 'Präposition „dank“ (Wird im Deutschen mit dem Dativ verwendet).',
      gemäß: 'Präposition „gemäß“ (Fordert im Deutschen den Dativ).',
      entsprechend: 'Präposition „entsprechend“ (Fordert den Dativ).'
    };

    // 2. Two-way Prepositions (Wechselpräpositionen on "Wo?")
    const wechselPreps: Record<string, string> = {
      in: 'Wechselpräposition „in“ (Feste Ortsangabe auf die Frage „Wo?“ ➔ Dativ: Wo geschieht es? ➔ in dem/einem ...).',
      im: 'Wechselpräposition „in“ (Ortsangabe auf die Frage „Wo?“ ➔ Dativ).',
      an: 'Wechselpräposition „an“ (Ortsangabe auf die Frage „Wo?“ ➔ Dativ: Wo ist es? ➔ an der/einem ...).',
      am: 'Wechselpräposition „an“ (Orts- oder Zeitangabe auf die Frage „Wo? / Wann?“ ➔ Dativ).',
      auf: 'Wechselpräposition „auf“ (Feste Ortsangabe auf die Frage „Wo?“ ➔ Dativ: z. B. auf dem Tisch).',
      unter: 'Wechselpräposition „unter“ (Ortsangabe oder Zustand auf die Frage „Wo?“ ➔ Dativ).',
      über: 'Wechselpräposition „über“ (Feste Position auf die Frage „Wo?“ ➔ Dativ).',
      vor: 'Wechselpräposition „vor“ (Orts- oder Zeitangabe auf die Frage „Wo? / Wann?“ ➔ Dativ: z. B. vor der Kirche).',
      hinter: 'Wechselpräposition „hinter“ (Ortsangabe auf die Frage „Wo?“ ➔ Dativ).',
      neben: 'Wechselpräposition „neben“ (Ortsangabe auf die Frage „Wo?“ ➔ Dativ).',
      zwischen: 'Wechselpräposition „zwischen“ (Ortsangabe auf die Frage „Wo?“ ➔ Dativ).'
    };

    if (dativPreps[lastWord]) return dativPreps[lastWord];
    if (wechselPreps[lastWord]) return wechselPreps[lastWord];
    if (dativPreps[firstWord]) return dativPreps[firstWord];
    if (wechselPreps[firstWord]) return wechselPreps[firstWord];

    // 3. Dativ Verbs
    if (/helf|hilf|half|geholfen/.test(lowerFull)) {
      return 'Verb „helfen“ (Das Verb „helfen“ fordert im Deutschen immer ein Dativ-Objekt: Wem helfe ich? ➔ Dativ).';
    }
    if (/geb|gibt|gab|gegeben/.test(lowerFull)) {
      return 'Verb „geben“ (Das Verb „geben“ verlangt das indirekte Dativ-Objekt / den Empfänger: Wem gibt man etwas? ➔ Dativ).';
    }
    if (/schenk/.test(lowerFull)) {
      return 'Verb „schenken“ (Das Verb „schenken“ verlangt den Empfänger im Dativ: Wem schenkt man etwas? ➔ Dativ).';
    }
    if (/schick|send/.test(lowerFull)) {
      return 'Verb „schicken“ (Verlangt den Adressaten / Empfänger im Dativ: Wem schickt man etwas? ➔ Dativ).';
    }
    if (/dank/.test(lowerFull)) {
      return 'Verb „danken“ (Das Verb „danken“ fordert immer ein Dativ-Objekt: Wem danke ich? ➔ Dativ).';
    }
    if (/erzähl/.test(lowerFull)) {
      return 'Verb „erzählen“ (Das Verb „erzählen“ verlangt den Zuhörer / Empfänger im Dativ: Wem erzähle ich etwas? ➔ Dativ).';
    }
    if (/erklär/.test(lowerFull)) {
      return 'Verb „erklären“ (Verlangt den Zuhörer im Dativ: Wem erklärt man etwas? ➔ Dativ).';
    }
    if (/folg/.test(lowerFull)) {
      return 'Verb „folgen“ (Das Verb „folgen“ verlangt immer den Dativ: Wem folge ich? ➔ Dativ).';
    }
    if (/vertrau/.test(lowerFull)) {
      return 'Verb „vertrauen“ (Das Verb „vertrauen“ fordert den Dativ: Wem vertraue ich? ➔ Dativ).';
    }
    if (/begegn/.test(lowerFull)) {
      return 'Verb „begegnen“ (Das Verb „begegnen“ fordert immer den Dativ: Wem begegne ich? ➔ Dativ).';
    }
    if (/gefällt|gefallen|gefiel/.test(lowerFull)) {
      return 'Verb „gefallen“ (Das Verb „gefallen“ fordert den Dativ: Wem gefällt es? ➔ Dativ).';
    }
    if (/gehör/.test(lowerFull)) {
      return 'Verb „gehören“ (Das Verb „gehören“ fordert den Dativ: Wem gehört es? ➔ Dativ).';
    }
    if (/näher/.test(lowerFull)) {
      return 'Verb „sich nähern“ (Das Verb „sich nähern“ verlangt den Dativ: Wem nähert man sich? ➔ Dativ).';
    }
    if (/widm/.test(lowerFull)) {
      return 'Verb „sich widmen“ (Das Verb „sich widmen“ verlangt den Dativ: Wem/Worauf widmet man sich? ➔ Dativ).';
    }
    if (/pass/.test(lowerFull)) {
      return 'Verb „passen / sich anpassen“ (Fordert den Dativ: Wem passt es / passt man sich an? ➔ Dativ).';
    }
    if (/stimm/.test(lowerFull)) {
      return 'Verb „zustimmen“ (Das Verb „zustimmen“ fordert den Dativ: Wem stimmt man zu? ➔ Dativ).';
    }
    if (/schad/.test(lowerFull)) {
      return 'Verb „schaden“ (Das Verb „schaden“ fordert den Dativ: Wem schadet es? ➔ Dativ).';
    }
    if (/nütz|nutz/.test(lowerFull)) {
      return 'Verb „nützen“ (Das Verb „nützen“ fordert den Dativ: Wem nützt es? ➔ Dativ).';
    }
    if (/antwort/.test(lowerFull)) {
      return 'Verb „antworten“ (Das Verb „antworten“ fordert für Personen den Dativ: Wem antworte ich? ➔ Dativ).';
    }
    if (/tat.*gut|tut.*gut/.test(lowerFull)) {
      return 'Ausdruck „gut tun“ (Wem tut etwas gut? ➔ Dativ: z. B. meinem Rücken).';
    }
    if (/entging|entgehen/.test(lowerFull)) {
      return 'Verb „entgehen“ (Wem entgeht man? ➔ Dativ).';
    }
    if (/ausgesetzt/.test(lowerFull)) {
      return 'Ausdruck „ausgesetzt sein“ (Wem oder was ist man ausgesetzt? ➔ Dativ).';
    }
    if (/hinzufüg/.test(lowerFull)) {
      return 'Verb „hinzufügen“ (Wem fügt man etwas hinzu? ➔ Dativ).';
    }
    if (/stell/.test(lowerFull) && /problem|aufgabe/.test(lowerFull)) {
      return 'Ausdruck „sich einer Sache stellen“ (Wem stellt man sich? ➔ Dativ).';
    }
    return 'Dativ-Objekt oder Dativ-Präposition im Satz (Frage: Wem oder was? ➔ Dativ).';
  }

  if (c === 'akkusativ') {
    const akkPreps: Record<string, string> = {
      für: 'Präposition „für“ (Die Präposition „für“ fordert im Deutschen ausnahmslos den Akkusativ).',
      ohne: 'Präposition „ohne“ (Die Präposition „ohne“ fordert immer den Akkusativ).',
      durch: 'Präposition „durch“ (Die Präposition „durch“ fordert immer den Akkusativ).',
      um: 'Präposition „um“ (Die Präposition „um“ fordert immer den Akkusativ).',
      gegen: 'Präposition „gegen“ (Die Präposition „gegen“ fordert immer den Akkusativ).',
      bis: 'Präposition „bis“ (Fordert den Akkusativ).',
      entlang: 'Präposition „entlang“ (Fordert den Akkusativ).'
    };
    if (akkPreps[lastWord]) return akkPreps[lastWord];
    if (akkPreps[firstWord]) return akkPreps[firstWord];

    const wechselPrepsAkk: Record<string, string> = {
      in: 'Wechselpräposition „in“ (Richtung oder Zielbewegung auf die Frage „Wohin?“ ➔ Akkusativ).',
      an: 'Wechselpräposition „an“ (Richtung oder Zielbewegung auf die Frage „Wohin?“ ➔ Akkusativ).',
      auf: 'Wechselpräposition „auf“ (Richtung oder Zielbewegung auf die Frage „Wohin?“ ➔ Akkusativ).',
      unter: 'Wechselpräposition „unter“ (Richtung oder Zielbewegung auf die Frage „Wohin?“ ➔ Akkusativ).',
      über: 'Wechselpräposition „über“ (Richtung oder Zielbewegung auf die Frage „Wohin?“ ➔ Akkusativ).',
      vor: 'Wechselpräposition „vor“ (Richtung oder Zielbewegung auf die Frage „Wohin?“ ➔ Akkusativ).',
      hinter: 'Wechselpräposition „hinter“ (Richtung oder Zielbewegung auf die Frage „Wohin?“ ➔ Akkusativ).',
      neben: 'Wechselpräposition „neben“ (Richtung oder Zielbewegung auf die Frage „Wohin?“ ➔ Akkusativ).'
    };
    if (wechselPrepsAkk[lastWord]) return wechselPrepsAkk[lastWord];
    if (wechselPrepsAkk[firstWord]) return wechselPrepsAkk[firstWord];

    return 'Transitives Verb (Das Nomen ist das direkte Akkusativ-Objekt des Verbs auf die Frage: „Wen oder was?“).';
  }

  if (c === 'genitiv') {
    const genPreps: Record<string, string> = {
      wegen: 'Präposition „wegen“ (Fordert standardsprachlich den Genitiv: Wessen?).',
      während: 'Präposition „während“ (Fordert im Deutschen den Genitiv: Wessen?).',
      trotz: 'Präposition „trotz“ (Fordert standardsprachlich den Genitiv).',
      anstatt: 'Präposition „anstatt“ (Fordert den Genitiv).',
      statt: 'Präposition „statt“ (Fordert den Genitiv).',
      innerhalb: 'Präposition „innerhalb“ (Fordert den Genitiv).',
      außerhalb: 'Präposition „außerhalb“ (Fordert den Genitiv).',
      aufgrund: 'Präposition „aufgrund“ (Fordert den Genitiv).'
    };
    if (genPreps[lastWord]) return genPreps[lastWord];
    if (genPreps[firstWord]) return genPreps[firstWord];

    return 'Genitiv-Attribut (Drückt ein Besitz-, Zugehörigkeits- oder Herkunftsverhältnis aus: Frage „Wessen?“).';
  }

  if (c === 'nominativ') {
    if (/ist|sind|war|waren|wird|werden|bleibt|bleiben/.test(lowerFull)) {
      return 'Subjekt / Prädikatsnomen (Steht im Nominativ als Subjekt oder nach „sein / werden / bleiben“ auf die Frage: „Wer oder was?“).';
    }
    return 'Subjekt des Satzes (Das Nomen führt die Handlung aus: Frage „Wer oder was?“ ➔ Nominativ).';
  }

  return '';
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
    caseLine = `Fall: Das Nomen steht im Dativ (Wem-Fall).`;
  } else {
    caseLine = `Fall: Das Nomen drückt ein Besitz- oder Zugehörigkeitsverhältnis aus (Genitiv / Wessen-Fall).`;
  }

  const whyCaseReason = getWhyCaseReason(c, ex.sentenceStart, ex.fullSentence);

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
    caseName: cName,
    whyCaseReason,
    patternTitle,
    patternDetails
  };
}
