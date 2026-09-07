import { downloadFile } from '@huggingface/hub';
import type { StoryChapter, OpenRouterConfig, Question } from './types';
import { streamOpenRouter } from './openrouter';

const CACHE_DB_NAME = 'GermanHelper_HF_10kGNAD';
const CACHE_STORE_NAME = 'articles_cache';
const CACHE_KEY = '10kgnad_articles_v1';
export const MIN_ARTICLE_WORDS = 150;

export interface NewsArticle {
  id: string;
  category: string;
  text: string;
  wordCount: number;
  title?: string;
}

// Candidate repository URLs (user's repo first, with standard fallbacks)
const HF_REPOS = [
  { repo: 'riversnow/10kgnad', file: 'articles.csv' },
  { repo: 'riversnow/10kgnad', file: 'train.csv' },
  { repo: 'lschoen/10kgnad', file: 'articles.csv' },
  { repo: 'tblock/10kGNAD', file: 'articles.csv', isGithub: true }
];

/**
 * Open IndexedDB for persistent caching of large datasets in the browser
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB nicht verfügbar.'));
      return;
    }
    const request = window.indexedDB.open(CACHE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
        db.createObjectStore(CACHE_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Loads cached articles from IndexedDB
 */
export async function getCachedArticles(): Promise<NewsArticle[] | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(CACHE_STORE_NAME, 'readonly');
      const store = tx.objectStore(CACHE_STORE_NAME);
      const req = store.get(CACHE_KEY);
      req.onsuccess = () => {
        const res = req.result;
        if (Array.isArray(res) && res.length > 0) {
          resolve(res);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Saves articles array to IndexedDB
 */
async function saveArticlesToCache(articles: NewsArticle[]): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(CACHE_STORE_NAME);
      store.put(articles, CACHE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('Fehler beim Speichern im IndexedDB-Cache:', e);
  }
}

/**
 * Clears cached dataset
 */
export async function clearArticlesCache(): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(CACHE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(CACHE_STORE_NAME);
    store.delete(CACHE_KEY);
  } catch (e) {
    console.warn('Fehler beim Leeren des Caches:', e);
  }
}

/**
 * Parses raw 10kGNAD semicolon-separated CSV text into filtered articles
 */
export function parse10kGnadCsv(csvText: string, minWords = MIN_ARTICLE_WORDS): NewsArticle[] {
  const lines = csvText.split('\n');
  const articles: NewsArticle[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // 10kGNAD format is "Category;ArticleText"
    const semiIdx = rawLine.indexOf(';');
    if (semiIdx === -1) continue;

    let category = rawLine.substring(0, semiIdx).replace(/^["']|["']$/g, '').trim();
    let text = rawLine.substring(semiIdx + 1).replace(/^["']|["']$/g, '').trim();

    // Clean up quotes and formatting
    text = text.replace(/""/g, '"').replace(/\\n/g, '\n\n').trim();

    const wordCount = text.split(/\s+/).filter(Boolean).length;
    if (wordCount >= minWords) {
      articles.push({
        id: `gnad-${articles.length + 1}`,
        category: category || 'Nachrichten',
        text,
        wordCount
      });
    }
  }

  return articles;
}

/**
 * Downloads 10kGNAD dataset from Hugging Face Hub, filters by word count, and caches it
 */
export async function downloadAndLoad10kGnad(
  onProgress?: (statusText: string, progressPercent?: number) => void
): Promise<NewsArticle[]> {
  // Check cache first
  onProgress?.('Überprüfe lokalen Zwischenspeicher...');
  const cached = await getCachedArticles();
  if (cached && cached.length > 0) {
    onProgress?.(`Geladen aus Zwischenspeicher (${cached.length} Artikel verfügbar).`, 100);
    return cached;
  }

  let downloadedText = '';
  let successfulSource = '';

  for (const candidate of HF_REPOS) {
    try {
      onProgress?.(`Lade ${candidate.file} von Hugging Face (${candidate.repo})...`);

      if (candidate.isGithub) {
        const rawUrl = `https://raw.githubusercontent.com/${candidate.repo}/master/${candidate.file}`;
        const res = await fetch(rawUrl);
        if (res.ok) {
          downloadedText = await res.text();
          successfulSource = candidate.repo;
          break;
        }
      } else {
        // Try @huggingface/hub downloadFile first
        try {
          const blobResponse = await (downloadFile as any)({
            repo: candidate.repo,
            path: candidate.file,
            repoType: 'dataset'
          });
          if (blobResponse) {
            downloadedText = await blobResponse.text();
            successfulSource = candidate.repo;
            break;
          }
        } catch {
          // Fallback to direct raw HTTP
          const rawUrl = `https://huggingface.co/datasets/${candidate.repo}/raw/main/${candidate.file}`;
          const res = await fetch(rawUrl);
          if (res.ok) {
            downloadedText = await res.text();
            successfulSource = candidate.repo;
            break;
          }
        }
      }
    } catch (err) {
      console.warn(`Fehler beim Laden von ${candidate.repo}:`, err);
    }
  }

  if (!downloadedText) {
    throw new Error(
      'Konnte den 10kGNAD-Datensatz von Hugging Face (riversnow/10kgnad) nicht herunterladen. Bitte prüfe deine Internetverbindung.'
    );
  }

  onProgress?.(`Verarbeite und filtere Artikel (Mindestlänge: ${MIN_ARTICLE_WORDS} Wörter)...`);
  const articles = parse10kGnadCsv(downloadedText, MIN_ARTICLE_WORDS);

  if (articles.length === 0) {
    throw new Error('Keine Artikel mit ausreichender Wortanzahl gefunden.');
  }

  onProgress?.(`Speichere ${articles.length} qualifizierte Artikel im Browser-Cache...`);
  await saveArticlesToCache(articles);

  onProgress?.(`Bereit! (${articles.length} Artikel geladen von ${successfulSource})`, 100);
  return articles;
}

/**
 * Gets a random article from the dataset with its 1-based index
 */
export function getRandomArticleWithIndex(articles: NewsArticle[]): { article: NewsArticle; index: number } {
  if (articles.length === 0) {
    throw new Error('Keine Artikel verfügbar.');
  }
  const randomIndex = Math.floor(Math.random() * articles.length);
  return {
    article: articles[randomIndex],
    index: randomIndex + 1
  };
}

/**
 * Gets a specific article by 1-based index (with bounds wrapping if out of range)
 */
export function getArticleByIndex(articles: NewsArticle[], articleNum: number): { article: NewsArticle; index: number } {
  if (articles.length === 0) {
    throw new Error('Keine Artikel verfügbar.');
  }
  let normalized = Math.floor(articleNum);
  if (isNaN(normalized) || normalized < 1) normalized = 1;
  const arrayIdx = (normalized - 1) % articles.length;
  return {
    article: articles[arrayIdx],
    index: arrayIdx + 1
  };
}

/**
 * Gets a random article from the dataset (backwards compatibility)
 */
export function getRandomArticle(articles: NewsArticle[]): NewsArticle {
  return getRandomArticleWithIndex(articles).article;
}

/**
 * Derives an instant headline from the article text and category
 */
export function deriveTitleFromArticle(article: NewsArticle): string {
  const firstLine = article.text.split('\n')[0].trim();
  const match = firstLine.match(/^([^.!?\n]+[.!?]?)/);
  if (match && match[1]) {
    const candidate = match[1].trim();
    if (candidate.length <= 95) return candidate;
    return candidate.substring(0, 85).trim() + '...';
  }
  return `Zeitungsartikel • ${article.category}`;
}

/**
 * Gets cached or derived title for an article
 */
export function getArticleTitle(article: NewsArticle): string {
  if (article.title) return article.title;
  const derived = deriveTitleFromArticle(article);
  article.title = derived;
  return derived;
}

export interface ArticleSearchResult {
  article: NewsArticle;
  index: number;
  title: string;
}

/**
 * Search articles by title, category, or index
 */
export function searchArticlesByTitle(
  articles: NewsArticle[],
  query: string,
  selectedCategory?: string,
  limit = 50
): ArticleSearchResult[] {
  const cleanQuery = query.trim().toLowerCase();
  const hasCatFilter = Boolean(selectedCategory && selectedCategory !== 'Alle');
  const results: ArticleSearchResult[] = [];

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    if (hasCatFilter && article.category.toLowerCase() !== selectedCategory!.toLowerCase()) {
      continue;
    }

    const title = getArticleTitle(article);
    if (!cleanQuery) {
      results.push({
        article,
        index: i + 1,
        title
      });
      if (results.length >= limit) break;
      continue;
    }

    const category = article.category || '';
    const indexStr = String(i + 1);

    if (
      title.toLowerCase().includes(cleanQuery) ||
      category.toLowerCase().includes(cleanQuery) ||
      indexStr === cleanQuery ||
      article.id.toLowerCase().includes(cleanQuery)
    ) {
      results.push({
        article,
        index: i + 1,
        title
      });
      if (results.length >= limit) break;
    }
  }

  return results;
}

/**
 * Parses questions from LLM stream lines (numbered 1., 2., 3. or bullet points)
 */
export function parseQuestionsFromText(rawText: string): Question[] {
  const questions: Question[] = [];
  const lines = rawText.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    const qMatch = trimmed.match(/^(?:(?:\d+[\.\)]|[-*•])\s*)(.+)/);
    if (qMatch && qMatch[1]) {
      const qText = qMatch[1].trim();
      if (qText.length > 5) {
        questions.push({
          id: `q-${Date.now()}-${questions.length + 1}`,
          questionGerman: qText,
          userDraftAnswer: '',
          isEvaluating: false,
          lastEvaluation: null
        });
      }
    }
  }

  if (questions.length === 0 && rawText.trim()) {
    const splitByQuestionMark = rawText.split('?').filter((s) => s.trim().length > 10);
    for (let i = 0; i < Math.min(3, splitByQuestionMark.length); i++) {
      questions.push({
        id: `q-${Date.now()}-${i + 1}`,
        questionGerman: splitByQuestionMark[i].replace(/^[^a-zA-ZÄÖÜäöüß]+/, '').trim() + '?',
        userDraftAnswer: '',
        isEvaluating: false,
        lastEvaluation: null
      });
    }
  }

  return questions;
}

/**
 * Streams ONLY the 3 comprehension questions for an article that is already displayed
 */
export async function generateQuestionsOnlyStream(
  config: OpenRouterConfig,
  article: NewsArticle,
  onChunk: (accumulatedText: string) => void,
  signal?: AbortSignal
): Promise<Question[]> {
  const systemPrompt = `Du bist ein fachkundiger deutscher Sprachexperte.
Dir liegt ein authentischer deutschsprachiger Zeitungsartikel (Ressort: ${article.category}) vor.

Aufgabe:
Formuliere genau 3 anregende, inhaltliche Verständnisfragen zum Artikel auf Deutsch.
- Verwende ausschließlich Deutsch (kein Englisch).
- Erstelle KEINEN Wortschatz und wiederhole NICHT den Artikeltext.
- Formatiere ausschließlich die 3 nummerierten Fragen wie folgt:

1. Erste Verständnisfrage zum Text?
2. Zweite Verständnisfrage zum Text?
3. Dritte Verständnisfrage zum Text?`;

  const userPrompt = `Formuliere 3 verständliche Inhaltsfragen zu folgendem Zeitungsartikel:\n\n"""\n${article.text.slice(0, 3500)}\n"""`;

  const rawStream = await streamOpenRouter(
    config,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    onChunk,
    0.5,
    signal
  );

  return parseQuestionsFromText(rawStream);
}
