import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(ROOT_DIR, 'app/src/routes/projects/german-cases-trainer/data/top4000_cases.json');

const finalExercises = [
  // 1. Jurist (wordId: 8461, m)
  {
    id: 'ex_8461_akkusativ_manual_8461',
    wordId: 8461,
    baseNoun: 'Jurist',
    originalWord: 'der Jurist (die Juristen)',
    gender: 'm',
    case: 'akkusativ',
    determinerGroup: 'def',
    determinerHint: '(der, die, das, dem, den, des)',
    sentenceStart: 'Wir haben gestern ',
    targetAnswer: 'den Juristen',
    sentenceEnd: ' um Rat gefragt.',
    acceptedAnswers: ['den juristen'],
    fullSentence: 'Wir haben gestern den Juristen um Rat gefragt.',
    translation: 'We asked the lawyer for advice yesterday.',
    ruleExplanation: "Maskulines Nomen mit n-Deklination im Akkusativ ('den Juristen').",
    category: 'top4000'
  },
  {
    id: 'ex_8461_dativ_manual_8461',
    wordId: 8461,
    baseNoun: 'Jurist',
    originalWord: 'der Jurist (die Juristen)',
    gender: 'm',
    case: 'dativ',
    determinerGroup: 'indef',
    determinerHint: '(ein, einem, einer, eines)',
    sentenceStart: 'Ich vertraue ',
    targetAnswer: 'einem Juristen',
    sentenceEnd: ' in dieser Angelegenheit vollkommen.',
    acceptedAnswers: ['einem juristen'],
    fullSentence: 'Ich vertraue einem Juristen in dieser Angelegenheit vollkommen.',
    translation: 'I trust a lawyer completely in this matter.',
    ruleExplanation: "Dativ nach dem Verb 'vertrauen' mit n-Deklination ('einem Juristen').",
    category: 'top4000'
  },

  // 2. Kerze (wordId: 8462, f)
  {
    id: 'ex_8462_akkusativ_manual_8462',
    wordId: 8462,
    baseNoun: 'Kerze',
    originalWord: 'die Kerze (die Kerzen)',
    gender: 'f',
    case: 'akkusativ',
    determinerGroup: 'indef',
    determinerHint: '(ein, einem, einer, eines)',
    sentenceStart: 'Bitte zünde ',
    targetAnswer: 'eine Kerze',
    sentenceEnd: ' auf dem Tisch an.',
    acceptedAnswers: ['eine kerze'],
    fullSentence: 'Bitte zünde eine Kerze auf dem Tisch an.',
    translation: 'Please light a candle on the table.',
    ruleExplanation: "Feminines Nomen im Akkusativ nach dem transitiven Verb 'anzünden'.",
    category: 'top4000'
  },
  {
    id: 'ex_8462_dativ_manual_8462',
    wordId: 8462,
    baseNoun: 'Kerze',
    originalWord: 'die Kerze (die Kerzen)',
    gender: 'f',
    case: 'dativ',
    determinerGroup: 'def',
    determinerHint: '(der, die, das, dem, den, des)',
    sentenceStart: 'Neben ',
    targetAnswer: 'der Kerze',
    sentenceEnd: ' steht ein altes Buch.',
    acceptedAnswers: ['der kerze'],
    fullSentence: 'Neben der Kerze steht ein altes Buch.',
    translation: 'Next to the candle stands an old book.',
    ruleExplanation: "Die lokale Wechselpräposition 'neben' verlangt hier Dativ (Ort: wo?).",
    category: 'top4000'
  },

  // 3. Koch (wordId: 8463, m)
  {
    id: 'ex_8463_akkusativ_manual_8463',
    wordId: 8463,
    baseNoun: 'Koch',
    originalWord: 'der Koch (die Köche)',
    gender: 'm',
    case: 'akkusativ',
    determinerGroup: 'indef',
    determinerHint: '(ein, einem, einer, eines)',
    sentenceStart: 'Das neue Restaurant sucht noch ',
    targetAnswer: 'einen Koch',
    sentenceEnd: ' für die italienische Küche.',
    acceptedAnswers: ['einen koch'],
    fullSentence: 'Das neue Restaurant sucht noch einen Koch für die italienische Küche.',
    translation: 'The new restaurant is still looking for a chef for Italian cuisine.',
    ruleExplanation: "Maskulines Nomen im Akkusativ nach 'suchen' ('einen Koch').",
    category: 'top4000'
  },
  {
    id: 'ex_8463_dativ_manual_8463',
    wordId: 8463,
    baseNoun: 'Koch',
    originalWord: 'der Koch (die Köche)',
    gender: 'm',
    case: 'dativ',
    determinerGroup: 'def',
    determinerHint: '(der, die, das, dem, den, des)',
    sentenceStart: 'Die Gäste danken ',
    targetAnswer: 'dem Koch',
    sentenceEnd: ' für das hervorragende Menü.',
    acceptedAnswers: ['dem koch'],
    fullSentence: 'Die Gäste danken dem Koch für das hervorragende Menü.',
    translation: 'The guests thank the chef for the excellent menu.',
    ruleExplanation: "Das Verb 'danken' verlangt den Dativ ('dem Koch').",
    category: 'top4000'
  },

  // 4. Kommune (wordId: 8465, f)
  {
    id: 'ex_8465_akkusativ_manual_8465',
    wordId: 8465,
    baseNoun: 'Kommune',
    originalWord: 'die Kommune (die Kommunen)',
    gender: 'f',
    case: 'akkusativ',
    determinerGroup: 'def',
    determinerHint: '(der, die, das, dem, den, des)',
    sentenceStart: 'Das neue Gesetz betrifft vor allem ',
    targetAnswer: 'die Kommune',
    sentenceEnd: ' und ihre Verwaltung.',
    acceptedAnswers: ['die kommune'],
    fullSentence: 'Das neue Gesetz betrifft vor allem die Kommune und ihre Verwaltung.',
    translation: 'The new law primarily affects the municipality and its administration.',
    ruleExplanation: "Feminines Nomen im Akkusativ nach dem Verb 'betreffen'.",
    category: 'top4000'
  },
  {
    id: 'ex_8465_dativ_manual_8465',
    wordId: 8465,
    baseNoun: 'Kommune',
    originalWord: 'die Kommune (die Kommunen)',
    gender: 'f',
    case: 'dativ',
    determinerGroup: 'indef',
    determinerHint: '(ein, einem, einer, eines)',
    sentenceStart: 'In ',
    targetAnswer: 'einer Kommune',
    sentenceEnd: ' gibt es viele wichtige Aufgaben für Bürger.',
    acceptedAnswers: ['einer kommune'],
    fullSentence: 'In einer Kommune gibt es viele wichtige Aufgaben für Bürger.',
    translation: 'In a municipality there are many important tasks for citizens.',
    ruleExplanation: "Lokale Präposition 'in' verlangt hier Dativ (Ort: wo?).",
    category: 'top4000'
  },

  // 5. Koralle (wordId: 8466, f)
  {
    id: 'ex_8466_akkusativ_manual_8466',
    wordId: 8466,
    baseNoun: 'Koralle',
    originalWord: 'die Koralle (die Korallen)',
    gender: 'f',
    case: 'akkusativ',
    determinerGroup: 'indef',
    determinerHint: '(ein, einem, einer, eines)',
    sentenceStart: 'Beim Tauchen entdeckte er ',
    targetAnswer: 'eine Koralle',
    sentenceEnd: ' mit leuchtenden Farben.',
    acceptedAnswers: ['eine koralle'],
    fullSentence: 'Beim Tauchen entdeckte er eine Koralle mit leuchtenden Farben.',
    translation: 'While diving he discovered a coral with bright colors.',
    ruleExplanation: "Feminines Nomen im Akkusativ nach 'entdecken'.",
    category: 'top4000'
  },
  {
    id: 'ex_8466_dativ_manual_8466',
    wordId: 8466,
    baseNoun: 'Koralle',
    originalWord: 'die Koralle (die Korallen)',
    gender: 'f',
    case: 'dativ',
    determinerGroup: 'def',
    determinerHint: '(der, die, das, dem, den, des)',
    sentenceStart: 'Kleine Fische verstecken sich hinter ',
    targetAnswer: 'der Koralle',
    sentenceEnd: ' vor größeren Räubern.',
    acceptedAnswers: ['der koralle'],
    fullSentence: 'Kleine Fische verstecken sich hinter der Koralle vor größeren Räubern.',
    translation: 'Small fish hide behind the coral from larger predators.',
    ruleExplanation: "Wechselpräposition 'hinter' mit Dativ (Ort: wo?).",
    category: 'top4000'
  },

  // 6. Krankenkasse (wordId: 8467, f)
  {
    id: 'ex_8467_akkusativ_manual_8467',
    wordId: 8467,
    baseNoun: 'Krankenkasse',
    originalWord: 'die Krankenkasse (die Krankenkassen)',
    gender: 'f',
    case: 'akkusativ',
    determinerGroup: 'def',
    determinerHint: '(der, die, das, dem, den, des)',
    sentenceStart: 'Er hat heute ',
    targetAnswer: 'die Krankenkasse',
    sentenceEnd: ' über seinen Wohnortwechsel informiert.',
    acceptedAnswers: ['die krankenkasse'],
    fullSentence: 'Er hat heute die Krankenkasse über seinen Wohnortwechsel informiert.',
    translation: 'Today he informed the health insurance company about his change of residence.',
    ruleExplanation: "Feminines Nomen im Akkusativ nach 'informieren'.",
    category: 'top4000'
  },
  {
    id: 'ex_8467_dativ_manual_8467',
    wordId: 8467,
    baseNoun: 'Krankenkasse',
    originalWord: 'die Krankenkasse (die Krankenkassen)',
    gender: 'f',
    case: 'dativ',
    determinerGroup: 'poss',
    determinerHint: '(mein, meiner, meinem, meine)',
    sentenceStart: 'Er schickte die Rechnung zu ',
    targetAnswer: 'seiner Krankenkasse',
    sentenceEnd: ' für eine Erstattung.',
    acceptedAnswers: ['seiner krankenkasse'],
    fullSentence: 'Er schickte die Rechnung zu seiner Krankenkasse für eine Erstattung.',
    translation: 'He sent the bill to his health insurance company for reimbursement.',
    ruleExplanation: "Die Präposition 'zu' verlangt immer den Dativ ('zu seiner Krankenkasse').",
    category: 'top4000'
  },

  // 7. Kunststoff (wordId: 8468, m)
  {
    id: 'ex_8468_akkusativ_manual_8468',
    wordId: 8468,
    baseNoun: 'Kunststoff',
    originalWord: 'der Kunststoff (die Kunststoffe)',
    gender: 'm',
    case: 'akkusativ',
    determinerGroup: 'dies',
    determinerHint: '(dieser, diese, diesem, diesen)',
    sentenceStart: 'Die Ingenieure verwenden ',
    targetAnswer: 'diesen Kunststoff',
    sentenceEnd: ' für leichte Bauteile.',
    acceptedAnswers: ['diesen kunststoff'],
    fullSentence: 'Die Ingenieure verwenden diesen Kunststoff für leichte Bauteile.',
    translation: 'The engineers use this plastic for lightweight components.',
    ruleExplanation: "Maskulines Nomen im Akkusativ nach 'verwenden' ('diesen Kunststoff').",
    category: 'top4000'
  },
  {
    id: 'ex_8468_dativ_manual_8468',
    wordId: 8468,
    baseNoun: 'Kunststoff',
    originalWord: 'der Kunststoff (die Kunststoffe)',
    gender: 'm',
    case: 'dativ',
    determinerGroup: 'indef',
    determinerHint: '(ein, einem, einer, eines)',
    sentenceStart: 'Das Gehäuse besteht aus ',
    targetAnswer: 'einem Kunststoff',
    sentenceEnd: ' mit hoher Hitzebeständigkeit.',
    acceptedAnswers: ['einem kunststoff'],
    fullSentence: 'Das Gehäuse besteht aus einem Kunststoff mit hoher Hitzebeständigkeit.',
    translation: 'The casing consists of a plastic with high heat resistance.',
    ruleExplanation: "Die Präposition 'aus' verlangt immer den Dativ ('aus einem Kunststoff').",
    category: 'top4000'
  },

  // 8. Landesregierung (wordId: 8469, f)
  {
    id: 'ex_8469_akkusativ_manual_8469',
    wordId: 8469,
    baseNoun: 'Landesregierung',
    originalWord: 'die Landesregierung (die Landesregierungen)',
    gender: 'f',
    case: 'akkusativ',
    determinerGroup: 'def',
    determinerHint: '(der, die, das, dem, den, des)',
    sentenceStart: 'Die Bürger kritisieren ',
    targetAnswer: 'die Landesregierung',
    sentenceEnd: ' wegen der Schulschließungen.',
    acceptedAnswers: ['die landesregierung'],
    fullSentence: 'Die Bürger kritisieren die Landesregierung wegen der Schulschließungen.',
    translation: 'The citizens criticize the state government because of the school closures.',
    ruleExplanation: "Feminines Nomen im Akkusativ nach dem transitiven Verb 'kritisieren'.",
    category: 'top4000'
  },
  {
    id: 'ex_8469_dativ_manual_8469',
    wordId: 8469,
    baseNoun: 'Landesregierung',
    originalWord: 'die Landesregierung (die Landesregierungen)',
    gender: 'f',
    case: 'dativ',
    determinerGroup: 'indef',
    determinerHint: '(ein, einem, einer, eines)',
    sentenceStart: 'Die Entscheidung liegt bei ',
    targetAnswer: 'einer Landesregierung',
    sentenceEnd: ' und ihren Ministerien.',
    acceptedAnswers: ['einer landesregierung'],
    fullSentence: 'Die Entscheidung liegt bei einer Landesregierung und ihren Ministerien.',
    translation: 'The decision lies with a state government and its ministries.',
    ruleExplanation: "Die Präposition 'bei' verlangt immer den Dativ ('bei einer Landesregierung').",
    category: 'top4000'
  },

  // 9. Laune (wordId: 8470, f)
  {
    id: 'ex_8470_akkusativ_manual_8470',
    wordId: 8470,
    baseNoun: 'Laune',
    originalWord: 'die Laune (die Launen)',
    gender: 'f',
    case: 'akkusativ',
    determinerGroup: 'def',
    determinerHint: '(der, die, das, dem, den, des)',
    sentenceStart: 'Das schlechte Wetter verdirbt uns nicht ',
    targetAnswer: 'die Laune',
    sentenceEnd: ' am Wochenende.',
    acceptedAnswers: ['die laune'],
    fullSentence: 'Das schlechte Wetter verdirbt uns nicht die Laune am Wochenende.',
    translation: 'The bad weather does not spoil our mood on the weekend.',
    ruleExplanation: "Feminines Nomen im Akkusativ als direktes Objekt von 'verderben'.",
    category: 'top4000'
  },
  {
    id: 'ex_8470_dativ_manual_8470',
    wordId: 8470,
    baseNoun: 'Laune',
    originalWord: 'die Laune (die Launen)',
    gender: 'f',
    case: 'dativ',
    determinerGroup: 'indef',
    determinerHint: '(ein, einem, einer, eines)',
    sentenceStart: 'Mit ',
    targetAnswer: 'einer Laune',
    sentenceEnd: ' wie dieser lässt sich der Tag gut beginnen.',
    acceptedAnswers: ['einer laune'],
    fullSentence: 'Mit einer Laune wie dieser lässt sich der Tag gut beginnen.',
    translation: 'With a mood like this, the day can start well.',
    ruleExplanation: "Die Präposition 'mit' verlangt immer den Dativ ('mit einer Laune').",
    category: 'top4000'
  },

  // 10. Nahrungsmittel (wordId: 8472, n)
  {
    id: 'ex_8472_akkusativ_manual_8472',
    wordId: 8472,
    baseNoun: 'Nahrungsmittel',
    originalWord: 'das Nahrungsmittel (die Nahrungsmittel)',
    gender: 'n',
    case: 'akkusativ',
    determinerGroup: 'def',
    determinerHint: '(der, die, das, dem, den, des)',
    sentenceStart: 'Der Arzt empfahl ',
    targetAnswer: 'das Nahrungsmittel',
    sentenceEnd: ' wegen seines hohen Vitamingehalts.',
    acceptedAnswers: ['das nahrungsmittel'],
    fullSentence: 'Der Arzt empfahl das Nahrungsmittel wegen seines hohen Vitamingehalts.',
    translation: 'The doctor recommended the food because of its high vitamin content.',
    ruleExplanation: "Neutrales Nomen im Akkusativ nach dem transitiven Verb 'empfehlen'.",
    category: 'top4000'
  },
  {
    id: 'ex_8472_dativ_manual_8472',
    wordId: 8472,
    baseNoun: 'Nahrungsmittel',
    originalWord: 'das Nahrungsmittel (die Nahrungsmittel)',
    gender: 'n',
    case: 'dativ',
    determinerGroup: 'indef',
    determinerHint: '(ein, einem, einer, eines)',
    sentenceStart: 'Er sucht nach ',
    targetAnswer: 'einem Nahrungsmittel',
    sentenceEnd: ' ohne künstliche Zusatzstoffe.',
    acceptedAnswers: ['einem nahrungsmittel'],
    fullSentence: 'Er sucht nach einem Nahrungsmittel ohne künstliche Zusatzstoffe.',
    translation: 'He is searching for a food without artificial additives.',
    ruleExplanation: "Die Präposition 'nach' verlangt immer den Dativ ('nach einem Nahrungsmittel').",
    category: 'top4000'
  },

  // 11. Niederländisch (wordId: 8474, n)
  {
    id: 'ex_8474_akkusativ_manual_8474',
    wordId: 8474,
    baseNoun: 'Niederländisch',
    originalWord: 'das Niederländisch',
    gender: 'n',
    case: 'akkusativ',
    determinerGroup: 'def',
    determinerHint: '(der, die, das, dem, den, des)',
    sentenceStart: 'Er versteht ',
    targetAnswer: 'das Niederländisch',
    sentenceEnd: ' seiner Großeltern sehr gut.',
    acceptedAnswers: ['das niederländisch'],
    fullSentence: 'Er versteht das Niederländisch seiner Großeltern sehr gut.',
    translation: 'He understands the Dutch of his grandparents very well.',
    ruleExplanation: "Neutrales Nomen im Akkusativ nach dem Verb 'verstehen'.",
    category: 'top4000'
  },
  {
    id: 'ex_8474_dativ_manual_8474',
    wordId: 8474,
    baseNoun: 'Niederländisch',
    originalWord: 'das Niederländisch',
    gender: 'n',
    case: 'dativ',
    determinerGroup: 'indef',
    determinerHint: '(ein, einem, einer, eines)',
    sentenceStart: 'Der Text ist in ',
    targetAnswer: 'einem Niederländisch',
    sentenceEnd: ' aus dem 17. Jahrhundert verfasst.',
    acceptedAnswers: ['einem niederländisch'],
    fullSentence: 'Der Text ist in einem Niederländisch aus dem 17. Jahrhundert verfasst.',
    translation: 'The text is written in a Dutch from the 17th century.',
    ruleExplanation: "Präposition 'in' verlangt hier Dativ ('in einem Niederländisch').",
    category: 'top4000'
  },

  // 12. Philosoph (wordId: 8478, m)
  {
    id: 'ex_8478_akkusativ_manual_8478',
    wordId: 8478,
    baseNoun: 'Philosoph',
    originalWord: 'der Philosoph (die Philosophen)',
    gender: 'm',
    case: 'akkusativ',
    determinerGroup: 'def',
    determinerHint: '(der, die, das, dem, den, des)',
    sentenceStart: 'Die Studenten bewundern ',
    targetAnswer: 'den Philosophen',
    sentenceEnd: ' für seine klaren Gedanken.',
    acceptedAnswers: ['den philosophen'],
    fullSentence: 'Die Studenten bewundern den Philosophen für seine klaren Gedanken.',
    translation: 'The students admire the philosopher for his clear thoughts.',
    ruleExplanation: "Maskulines Nomen mit n-Deklination im Akkusativ nach 'bewundern' ('den Philosophen').",
    category: 'top4000'
  },
  {
    id: 'ex_8478_dativ_manual_8478',
    wordId: 8478,
    baseNoun: 'Philosoph',
    originalWord: 'der Philosoph (die Philosophen)',
    gender: 'm',
    case: 'dativ',
    determinerGroup: 'indef',
    determinerHint: '(ein, einem, einer, eines)',
    sentenceStart: 'Sie hörte aufmerksam ',
    targetAnswer: 'einem Philosophen',
    sentenceEnd: ' bei seinem Vortrag zu.',
    acceptedAnswers: ['einem philosophen'],
    fullSentence: 'Sie hörte aufmerksam einem Philosophen bei seinem Vortrag zu.',
    translation: 'She listened attentively to a philosopher during his lecture.',
    ruleExplanation: "Das trennbare Verb 'zuhören' verlangt den Dativ ('einem Philosophen').",
    category: 'top4000'
  },

  // 13. Prinz (wordId: 8479, m)
  {
    id: 'ex_8479_akkusativ_manual_8479',
    wordId: 8479,
    baseNoun: 'Prinz',
    originalWord: 'der Prinz (die Prinzen)',
    gender: 'm',
    case: 'akkusativ',
    determinerGroup: 'def',
    determinerHint: '(der, die, das, dem, den, des)',
    sentenceStart: 'Das Volk begrüßte ',
    targetAnswer: 'den Prinzen',
    sentenceEnd: ' mit großem Jubel.',
    acceptedAnswers: ['den prinzen'],
    fullSentence: 'Das Volk begrüßte den Prinzen mit großem Jubel.',
    translation: 'The people welcomed the prince with great cheering.',
    ruleExplanation: "Maskulines Nomen mit n-Deklination im Akkusativ nach 'begrüßen' ('den Prinzen').",
    category: 'top4000'
  },
  {
    id: 'ex_8479_dativ_manual_8479',
    wordId: 8479,
    baseNoun: 'Prinz',
    originalWord: 'der Prinz (die Prinzen)',
    gender: 'm',
    case: 'dativ',
    determinerGroup: 'indef',
    determinerHint: '(ein, einem, einer, eines)',
    sentenceStart: 'Im Märchen begegnet sie ',
    targetAnswer: 'einem Prinzen',
    sentenceEnd: ' im tiefen Zauberwald.',
    acceptedAnswers: ['einem prinzen'],
    fullSentence: 'Im Märchen begegnet sie einem Prinzen im tiefen Zauberwald.',
    translation: 'In the fairy tale she meets a prince in the deep enchanted forest.',
    ruleExplanation: "Das Verb 'begegnen' verlangt den Dativ ('einem Prinzen').",
    category: 'top4000'
  },

  // 14. Profil (wordId: 8480, n)
  {
    id: 'ex_8480_akkusativ_manual_8480',
    wordId: 8480,
    baseNoun: 'Profil',
    originalWord: 'das Profil (die Profile)',
    gender: 'n',
    case: 'akkusativ',
    determinerGroup: 'indef',
    determinerHint: '(ein, einem, einer, eines)',
    sentenceStart: 'Für die Bewerbung erstellte sie ',
    targetAnswer: 'ein Profil',
    sentenceEnd: ' auf dem Berufsnetzwerk.',
    acceptedAnswers: ['ein profil'],
    fullSentence: 'Für die Bewerbung erstellte sie ein Profil auf dem Berufsnetzwerk.',
    translation: 'For the application she created a profile on the professional network.',
    ruleExplanation: "Neutrales Nomen im Akkusativ nach 'erstellen'.",
    category: 'top4000'
  },
  {
    id: 'ex_8480_dativ_manual_8480',
    wordId: 8480,
    baseNoun: 'Profil',
    originalWord: 'das Profil (die Profile)',
    gender: 'n',
    case: 'dativ',
    determinerGroup: 'def',
    determinerHint: '(der, die, das, dem, den, des)',
    sentenceStart: 'Auf ',
    targetAnswer: 'dem Profil',
    sentenceEnd: ' finden sich alle wichtigen Berufserfahrungen.',
    acceptedAnswers: ['dem profil'],
    fullSentence: 'Auf dem Profil finden sich alle wichtigen Berufserfahrungen.',
    translation: 'On the profile all important work experiences can be found.',
    ruleExplanation: "Lokale Wechselpräposition 'auf' mit Dativ (Ort: wo?).",
    category: 'top4000'
  }
];

// Load existing
const existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));

// Build map
const map = new Map();
for (const ex of existing) {
  const key = `${ex.wordId}_${ex.case}`;
  map.set(key, ex);
}

// Add the final 28
for (const ex of finalExercises) {
  const key = `${ex.wordId}_${ex.case}`;
  map.set(key, ex);
}

// Sort all exercises strictly:
// 1. Tier: top1000 (1) -> top2000 (2) -> top3000 (3) -> top4000 (4)
// 2. wordId ASC
// 3. case: nominativ (1) -> akkusativ (2) -> dativ (3)
const tierWeight = { top1000: 1, top2000: 2, top3000: 3, top4000: 4 };
const caseWeight = { nominativ: 1, akkusativ: 2, dativ: 3, genitiv: 4 };

const allList = Array.from(map.values()).sort((a, b) => {
  const tA = tierWeight[a.category] || 99;
  const tB = tierWeight[b.category] || 99;
  if (tA !== tB) return tA - tB;

  if (a.wordId !== b.wordId) return (a.wordId || 0) - (b.wordId || 0);

  const cA = caseWeight[a.case] || 99;
  const cB = caseWeight[b.case] || 99;
  return cA - cB;
});

// Atomic write
const tmpFile = `${OUTPUT_PATH}.tmp_${Date.now()}`;
fs.writeFileSync(tmpFile, JSON.stringify(allList, null, 2), 'utf8');
fs.renameSync(tmpFile, OUTPUT_PATH);

console.log(`Saved ${allList.length} exercises to ${OUTPUT_PATH}!`);
