import type { StorySession } from './types';

export const DEMO_STORY_SESSION: StorySession = {
  id: 'demo-session-1',
  title: 'Das Palimpsest der Friedrichstraße',
  createdAt: Date.now() - 3600000,
  updatedAt: Date.now(),
  difficulty: 'C1',
  genre: 'Literarische Reflexion & Stadtgeschichte',
  chapters: [
    {
      chapter: {
        id: 'ch-demo-1',
        chapterNumber: 1,
        titleGerman: 'Die Schichten der Zeit',
        storyGerman: `Im schwindenden Abendlicht eines nasskalten Novembertages verweilte Dr. Helene Vangerow in einem Antiquariat unweit des Bahnhofs Friedrichstraße. Der Raum, durchzogen vom herben Aroma uralten Papiers und feuchten Mauerwerks, wirkte wie eine Enklave gegen das unaufhörliche Getöse der Großstadt. Während sie geistesabwesend über den Buchrücken einer vergriffenen Monografie strich, fiel ihr ein unscheinbarer Band ins Auge, dessen pergamentener Einband von feinsten Rissen durchzogen war.

Beim vorsichtigen Aufschlagen offenbarte sich ihr ein faszinierendes Phänomen: Unter den verblassten Drucklettern einer scheinbar belanglosen Abhandlung über preußische Baustatistik aus dem späten 19. Jahrhundert zeichneten sich in zartem Sepia handschriftliche Randglossen ab – Gedankensplitter einer anonymen Zeitzeugin, die die Umbrüche der Weimarer Republik mit schonungsloser Schärfe seziert hatte. Besonders eine Notiz am unteren Rand von Seite 83 ließ Helenes Puls beschleunigen: »Wer die Stadt begreifen will, darf nicht auf ihre Monumente blicken, sondern muss die Risse in den Fundamenten deuten.«

Ehe Helene den Gedanken weiterverfolgen konnte, trat der betagte Inhaber des Ladens hinter dem schweren Samtvorhang hervor. Ohne ein Wort zu verlieren, schob er ihr eine verblichene Messingmünze über den Tresen, deren Prägung ein labyrinthartiges Symbol zeigte. »Sie haben das Manuskript nicht zufällig gefunden«, bemerkte er leise, wobei sein Blick eine beunruhigende Vertrautheit verriet.`,
        cefrLevel: 'C1',
        genre: 'Literarische Reflexion & Stadtgeschichte',
        vocabulary: [
          { german: 'das Palimpsest, -e', definitionGerman: 'Ein wiederverwendetes Schriftstück, dessen ursprünglicher Text noch durchscheint', partOfSpeech: 'Nomen', exampleSentence: 'Die Stadt gleicht einem vielschichtigen Palimpsest.' },
          { german: 'die Randglosse, -n', definitionGerman: 'Handschriftliche Anmerkung oder Kommentar am Rand eines Buches', partOfSpeech: 'Nomen', exampleSentence: 'Sie las die handschriftlichen Randglossen mit großer Neugier.' },
          { german: 'geistesabwesend', definitionGerman: 'In Gedanken versunken, unaufmerksam gegenüber der Umgebung', partOfSpeech: 'Adjektiv / Adverb', exampleSentence: 'Er rührte geistesabwesend in seinem Espresso.' },
          { german: 'schonungslos sezieren', definitionGerman: 'Etwas analytisch, kompromisslos und ohne Mitleid zerlegen', partOfSpeech: 'Redewendung', exampleSentence: 'Die Autorin sezierte die gesellschaftlichen Missstände schonungslos.' },
          { german: 'die Enklave, -n', definitionGerman: 'Ein abgeschlossener, geschützter Raum inmitten einer anderen Umgebung', partOfSpeech: 'Nomen', exampleSentence: 'Die Bibliothek war eine stille Enklave inmitten des Trubels.' }
        ],
        questions: [
          {
            id: 'q-demo-1',
            questionGerman: 'Welche doppelte Ebene verbirgt sich hinter dem Buch, das Dr. Helene Vangerow im Antiquariat entdeckt?',
            targetConcept: 'Substantivierungen & Relativsätze im Genitiv/Dativ',
            userDraftAnswer: '',
            lastEvaluation: null
          },
          {
            id: 'q-demo-2',
            questionGerman: 'Wie interpretiert die anonyme Randbemerkung auf Seite 83 das Wesen der Stadt Berlin?',
            targetConcept: 'Metaphorik & Konjunktiv I/II',
            userDraftAnswer: '',
            lastEvaluation: null
          },
          {
            id: 'q-demo-3',
            questionGerman: 'Welche Geste des Antiquars deutet darauf hin, dass Helenes Fund Teil eines größeren Mysteriums ist?',
            targetConcept: 'Kausale & konzessive Satzgefüge',
            userDraftAnswer: '',
            lastEvaluation: null
          }
        ]
      },
      userContinuation: '',
      continuationEvaluation: null
    }
  ],
  currentChapterIndex: 0
};
