export interface CategoryMeta {
  id: string;
  name: string;
  icon: string;
  group: string;
  color: string;
  desc: string;
}

export const CATEGORY_GROUPS = [
  'Alle',
  'Aktiv (> 0%)',
  'ChatGPT',
  'Häufigkeit',
  'Medizin & Gesundheit',
  'Natur & Tiere',
  'Essen & Trinken',
  'Wohnen & Haushalt',
  'Stadt, Verkehr & Reisen',
  'Freizeit & Sport',
  'Technik & Wissenschaft',
  'Alltag & Gesellschaft',
  'Gesellschaft & Beruf',
  'Zeit & Kalender',
  'Sonstiges'
] as const;

export const ALL_CATEGORIES: CategoryMeta[] = [
  // ChatGPT
  { id: 'neue-chatgpt-woerter', name: 'Neue ChatGPT-Wörter', icon: '✨', group: 'ChatGPT', color: '#a855f7', desc: 'Wörter aus ChatGPT-Sitzungen' },

  // Häufigkeit (Tiers)
  { id: 'top1000', name: 'Top 1000', icon: '🥇', group: 'Häufigkeit', color: '#6366f1', desc: 'Häufigster Grundwortschatz A1-A2' },
  { id: 'top2000', name: 'Top 2000', icon: '🥈', group: 'Häufigkeit', color: '#3b82f6', desc: 'Erweiterter Wortschatz B1' },
  { id: 'top3000', name: 'Top 3000', icon: '🥉', group: 'Häufigkeit', color: '#0ea5e9', desc: 'Aufbauwortschatz B2' },
  { id: 'top4000', name: 'Top 4000', icon: '📚', group: 'Häufigkeit', color: '#06b6d4', desc: 'Fortgeschrittener Wortschatz C1' },
  { id: 'top100', name: 'Top 100', icon: '⭐', group: 'Häufigkeit', color: '#eab308', desc: 'Die allerwichtigsten 100 Wörter' },

  // Medizin & Gesundheit
  { id: 'medical_anatomy_advanced', name: 'Anatomie (Vertieft)', icon: '🫀', group: 'Medizin & Gesundheit', color: '#ef4444', desc: 'Organe, Knochen, Muskeln' },
  { id: 'medical_diseases_symptoms', name: 'Krankheiten & Symptome', icon: '🩺', group: 'Medizin & Gesundheit', color: '#dc2626', desc: 'Symptome, Diagnosen, Leiden' },
  { id: 'medical_hospital', name: 'Krankenhaus & Klinik', icon: '🏥', group: 'Medizin & Gesundheit', color: '#b91c1c', desc: 'Station, OP, Ärzte, Pflege' },
  { id: 'medical_medications', name: 'Medikamente & Pharmazie', icon: '💊', group: 'Medizin & Gesundheit', color: '#991b1b', desc: 'Arznei, Tabletten, Salben' },
  { id: 'medical_teeth_dentistry', name: 'Zahnmedizin', icon: '🦷', group: 'Medizin & Gesundheit', color: '#fca5a5', desc: 'Zähne, Gebiss, Zahnarzt' },
  { id: 'medical_sciences', name: 'Medizinische Wissenschaften', icon: '🔬', group: 'Medizin & Gesundheit', color: '#7f1d1d', desc: 'Pathologie, Neurologie etc.' },
  { id: 'medical_anatomy_basic', name: 'Körperteile (Basis)', icon: '🖐️', group: 'Medizin & Gesundheit', color: '#f87171', desc: 'Körper, Kopf, Hand, Fuß' },
  { id: 'medical_basic', name: 'Medizin (Allgemein)', icon: '🩹', group: 'Medizin & Gesundheit', color: '#ec4899', desc: 'Gesundheit, Notfall, Verband' },

  // Natur & Tiere
  { id: 'plants', name: 'Pflanzen & Botanik', icon: '🌿', group: 'Natur & Tiere', color: '#16a34a', desc: 'Bäume, Blätter, Sträucher' },
  { id: 'animals_birds', name: 'Vögel', icon: '🦅', group: 'Natur & Tiere', color: '#059669', desc: 'Adler, Spatz, Taube, Eule' },
  { id: 'weather', name: 'Wetter & Klima', icon: '☀️', group: 'Natur & Tiere', color: '#f59e0b', desc: 'Regen, Sturm, Sonne, Nebel' },
  { id: 'gardening', name: 'Garten & Gartenbau', icon: '🧑‍🌾', group: 'Natur & Tiere', color: '#22c55e', desc: 'Beet, Rasen, Gartengeräte' },
  { id: 'animals_insects', name: 'Insekten & Kleintiere', icon: '🐝', group: 'Natur & Tiere', color: '#047857', desc: 'Biene, Fliege, Käfer' },
  { id: 'flowers', name: 'Blumen', icon: '🌸', group: 'Natur & Tiere', color: '#ec4899', desc: 'Rose, Tulpe, Nelke' },
  { id: 'animals_basic', name: 'Tiere (Basis)', icon: '🐾', group: 'Natur & Tiere', color: '#10b981', desc: 'Hund, Katze, Pferd' },

  // Essen & Trinken
  { id: 'food_spices', name: 'Gewürze & Kräuter', icon: '🧂', group: 'Essen & Trinken', color: '#b45309', desc: 'Pfeffer, Salz, Zimt, Kräuter' },
  { id: 'food_vegetables', name: 'Gemüse', icon: '🥕', group: 'Essen & Trinken', color: '#84cc16', desc: 'Karotte, Zwiebel, Tomate' },
  { id: 'food_fruits', name: 'Früchte & Obst', icon: '🍎', group: 'Essen & Trinken', color: '#e11d48', desc: 'Apfel, Banane, Zitrone' },
  { id: 'food_coffee', name: 'Kaffee & Heißgetränke', icon: '☕', group: 'Essen & Trinken', color: '#78350f', desc: 'Espresso, Röstung, Café' },
  { id: 'restaurants', name: 'Restaurants & Gastronomie', icon: '🍽️', group: 'Essen & Trinken', color: '#ea580c', desc: 'Menü, Kellner, Rechnung' },
  { id: 'food_berries', name: 'Beeren', icon: '🫐', group: 'Essen & Trinken', color: '#7c3aed', desc: 'Erdbeere, Himbeere, Blaubeere' },
  { id: 'food_nuts_dried_fruits', name: 'Nüsse & Trockenobst', icon: '🥜', group: 'Essen & Trinken', color: '#d97706', desc: 'Walnuss, Mandel, Rosine' },

  // Wohnen & Haushalt
  { id: 'home_kitchen_basic', name: 'Küche (Basis)', icon: '🍳', group: 'Wohnen & Haushalt', color: '#f97316', desc: 'Pfanne, Teller, Löffel' },
  { id: 'home_kitchen_advanced', name: 'Küche & Kochgeräte', icon: '🔪', group: 'Wohnen & Haushalt', color: '#fb923c', desc: 'Mixer, Backofen, Zubehör' },
  { id: 'home_furniture_advanced', name: 'Möbel & Einrichtung', icon: '🪑', group: 'Wohnen & Haushalt', color: '#a78bfa', desc: 'Kommode, Regal, Beleuchtung' },
  { id: 'home_furniture_basic', name: 'Möbel (Basis)', icon: '🛋️', group: 'Wohnen & Haushalt', color: '#8b5cf6', desc: 'Tisch, Stuhl, Bett, Schrank' },
  { id: 'packaging', name: 'Verpackungen & Behälter', icon: '📦', group: 'Wohnen & Haushalt', color: '#a3a3a3', desc: 'Karton, Flasche, Dose' },

  // Stadt, Verkehr & Reisen
  { id: 'buildings', name: 'Gebäude & Bauwerke', icon: '🏢', group: 'Stadt, Verkehr & Reisen', color: '#475569', desc: 'Turm, Rathaus, Palast' },
  { id: 'architecture', name: 'Architektur', icon: '🏛️', group: 'Stadt, Verkehr & Reisen', color: '#334155', desc: 'Fassade, Säule, Gewölbe' },
  { id: 'transport_train', name: 'Zug & Bahnverkehr', icon: '🚆', group: 'Stadt, Verkehr & Reisen', color: '#0369a1', desc: 'Gleis, Waggon, Lokomotive' },
  { id: 'transport_bike', name: 'Fahrrad & Radverkehr', icon: '🚲', group: 'Stadt, Verkehr & Reisen', color: '#0d9488', desc: 'Lenker, Pedale, Kette' },
  { id: 'town', name: 'Stadt & Viertel', icon: '🏙️', group: 'Stadt, Verkehr & Reisen', color: '#64748b', desc: 'Straße, Platz, Kreuzung' },
  { id: 'transport_basic', name: 'Verkehr (Basis)', icon: '🚗', group: 'Stadt, Verkehr & Reisen', color: '#0284c7', desc: 'Fahrzeug, Haltestelle' },
  { id: 'transport_auto', name: 'Auto & Kraftfahrzeuge', icon: '🚙', group: 'Stadt, Verkehr & Reisen', color: '#2563eb', desc: 'Motor, Bremse, Reifen' },
  { id: 'cardinal_directions', name: 'Himmelsrichtungen', icon: '🧭', group: 'Stadt, Verkehr & Reisen', color: '#14b8a6', desc: 'Norden, Süden, Osten, Westen' },

  // Freizeit & Sport
  { id: 'sports_ball', name: 'Ballsportarten', icon: '⚽', group: 'Freizeit & Sport', color: '#16a34a', desc: 'Fußball, Tennis, Basketball' },
  { id: 'sports_winter', name: 'Wintersport', icon: '⛷️', group: 'Freizeit & Sport', color: '#38bdf8', desc: 'Ski, Schlittschuh, Piste' },
  { id: 'sports_gymnastics', name: 'Fitness & Turnen', icon: '🤸', group: 'Freizeit & Sport', color: '#84cc16', desc: 'Übungen, Dehnen, Gerät' },
  { id: 'sports_water', name: 'Wassersport', icon: '🏊', group: 'Freizeit & Sport', color: '#06b6d4', desc: 'Schwimmen, Rudern, Segeln' },
  { id: 'sports', name: 'Sport (Allgemein)', icon: '🏅', group: 'Freizeit & Sport', color: '#eab308', desc: 'Wettkampf, Medaille, Stadion' },

  // Technik & Wissenschaft
  { id: 'space_advanced', name: 'Weltraum & Astronomie', icon: '🚀', group: 'Technik & Wissenschaft', color: '#6366f1', desc: 'Planet, Galaxie, Satellit' },
  { id: 'computer', name: 'Computer & Technik', icon: '💻', group: 'Technik & Wissenschaft', color: '#3b82f6', desc: 'Tastatur, Bildschirm, Datei' },
  { id: 'space_basic', name: 'Kosmos (Basis)', icon: '🌌', group: 'Technik & Wissenschaft', color: '#818cf8', desc: 'Stern, Mond, Sonne' },
  { id: 'geometric_figures', name: 'Geometrische Formen', icon: '📐', group: 'Technik & Wissenschaft', color: '#f59e0b', desc: 'Kreis, Dreieck, Viereck' },

  // Alltag & Gesellschaft
  { id: 'money', name: 'Geld & Finanzen', icon: '💰', group: 'Gesellschaft & Beruf', color: '#10b981', desc: 'Münze, Schein, Bankkonto' },
  { id: 'career', name: 'Beruf & Karriere', icon: '💼', group: 'Gesellschaft & Beruf', color: '#4f46e5', desc: 'Stelle, Bewerbung, Kollege' },
  { id: 'clothing', name: 'Kleidung & Mode', icon: '👗', group: 'Alltag & Gesellschaft', color: '#f43f5e', desc: 'Hemd, Hose, Jacke, Schuhe' },
  { id: 'school', name: 'Schule & Bildung', icon: '🎒', group: 'Alltag & Gesellschaft', color: '#8b5cf6', desc: 'Klasse, Tafel, Heft' },
  { id: 'newspapers_magazines', name: 'Zeitungen & Medien', icon: '📰', group: 'Alltag & Gesellschaft', color: '#64748b', desc: 'Artikel, Magazin, Schlagzeile' },
  { id: 'family_advanced', name: 'Familie (Erweitert)', icon: '👪', group: 'Alltag & Gesellschaft', color: '#db2777', desc: 'Neffe, Schwägerin, Vorfahren' },
  { id: 'family_basic', name: 'Familie (Basis)', icon: '👨‍👩‍👧', group: 'Alltag & Gesellschaft', color: '#ec4899', desc: 'Mutter, Vater, Kind' },
  { id: 'post', name: 'Post & Versand', icon: '📮', group: 'Alltag & Gesellschaft', color: '#eab308', desc: 'Brief, Briefmarke, Paket' },
  { id: 'greetings', name: 'Grüße & Höflichkeit', icon: '👋', group: 'Alltag & Gesellschaft', color: '#10b981', desc: 'Grußformeln und Verabschiedung' },

  // Zeit & Kalender
  { id: 'time', name: 'Zeit (Allgemein)', icon: '⏰', group: 'Zeit & Kalender', color: '#f59e0b', desc: 'Uhrzeit, Stunde, Minute' },
  { id: 'time_months', name: 'Monate', icon: '🗓️', group: 'Zeit & Kalender', color: '#f97316', desc: 'Januar bis Dezember' },
  { id: 'time_days_of_week', name: 'Wochentage', icon: '📅', group: 'Zeit & Kalender', color: '#eab308', desc: 'Montag bis Sonntag' },
  { id: 'time_seasons', name: 'Jahreszeiten', icon: '🍂', group: 'Zeit & Kalender', color: '#d97706', desc: 'Frühling, Sommer, Herbst, Winter' },

  // Sonstiges
  { id: 'basic', name: 'Grundbegriffe', icon: '🔤', group: 'Sonstiges', color: '#94a3b8', desc: 'Wichtige Elementarbegriffe' },
  { id: 'abbreviations', name: 'Abkürzungen', icon: '✂️', group: 'Sonstiges', color: '#64748b', desc: 'Gängige Kurzformen' },
  { id: 'question_words', name: 'Fragewörter', icon: '❓', group: 'Sonstiges', color: '#a855f7', desc: 'Interrogativbegriffe' }
];

export const CATEGORY_MAP: Record<string, CategoryMeta> = {};
for (const cat of ALL_CATEGORIES) {
  CATEGORY_MAP[cat.id] = cat;
}

export function getCategoryMeta(id: string): CategoryMeta {
  return CATEGORY_MAP[id] || {
    id,
    name: id,
    icon: '📁',
    group: 'Sonstiges',
    color: '#64748b',
    desc: id
  };
}
