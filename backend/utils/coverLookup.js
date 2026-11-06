// Finds candidate cover images for a book in public book catalogues and scores
// how well each candidate matches the book. Nothing here ever assigns a cover:
// the admin UI and the cover script decide what to do with the results.
//
// Sources:
//   - Open Library (https://openlibrary.org/dev/docs/api/covers). Covers are free
//     to display; we always link to the ID-based cover URL, which is the form
//     Open Library asks clients to use.
//   - Google Books (volumes endpoint). Used when GOOGLE_BOOKS_API_KEY is set;
//     without a key Google rate-limits shared IPs heavily, so it's best-effort.

import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeIsbn, isValidIsbn } from './isbn.js';

const USER_AGENT = 'AnimeBookstore/1.0 (cover lookup)';
const TIMEOUT_MS = 10000;
const UPLOADS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'uploads');

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout ?? TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...options,
      headers: { 'User-Agent': USER_AGENT, ...options.headers },
      signal: controller.signal,
      redirect: 'follow',
    });
  } finally {
    clearTimeout(timer);
  }
};

const fetchJson = async (url) => {
  const res = await fetchWithTimeout(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${new URL(url).hostname} responded ${res.status}`);
  return res.json();
};

// ---- Title helpers -------------------------------------------------------

const WORD_NUMBERS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

const normalizeText = (value) =>
  String(value ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** "Jujutsu Kaisen, Vol. 4" -> 4, "Vinland Saga, Book One" -> 1, "Attack On Titan 1" -> 1 */
export const parseVolumeNumber = (title) => {
  const text = String(title ?? '');
  const explicit = text.match(/\b(?:vol(?:ume)?|book|no|#)\.?\s*(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten)\b/i);
  if (explicit) {
    const raw = explicit[1].toLowerCase();
    return WORD_NUMBERS[raw] ?? Number(raw);
  }
  const trailing = text.match(/\s(\d{1,3})\s*$/);
  return trailing ? Number(trailing[1]) : null;
};

/** "Jujutsu Kaisen, Vol. 4" -> "Jujutsu Kaisen" */
export const parseSeries = (title) =>
  String(title ?? '')
    .replace(/\(.*?\)/g, '')
    .replace(/[,:\-–]?\s*\b(?:vol(?:ume)?|book|no|#)\.?\s*(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten)\b.*$/i, '')
    .replace(/\s+\d{1,3}\s*$/, '')
    .trim();

// Edition words that change which physical book (and cover) you're looking at.
const EDITION_MARKERS = [
  'black edition', 'vizbig', 'deluxe', '3 in 1', 'omnibus', 'box set', 'boxed set',
  'collection', 'coloring', 'colouring', 'artbook', 'art book', 'fanbook', 'novel', 'definitive',
];

const significantWords = (text) =>
  normalizeText(text).split(' ').filter((w) => w.length > 1 && !['the', 'of', 'no', 'a', 'an', 'and'].includes(w));

/**
 * Scores a catalogue result against a book. Returns the individual checks so the
 * admin UI can show *why* a candidate is or isn't trusted.
 */
export const assessMatch = (book, candidate) => {
  const bookIsbn = normalizeIsbn(book.isbn);
  const candidateIsbns = (candidate.isbns ?? []).map(normalizeIsbn);
  const isbnMatch = bookIsbn ? candidateIsbns.includes(bookIsbn) : null;

  const series = book.series || parseSeries(book.title);
  const candidateTitle = normalizeText(candidate.title);
  const seriesWords = significantWords(series);
  const titleMatch = seriesWords.length > 0 && seriesWords.every((w) => candidateTitle.includes(w));

  const bookVolume = book.volumeNumber ?? parseVolumeNumber(book.title);
  const candidateVolume = parseVolumeNumber(candidate.title);
  const volumeMatch = bookVolume == null ? null : candidateVolume == null ? null : candidateVolume === bookVolume;

  // Catalogue author names are sometimes only in Japanese script; treat that as unknown.
  const candidateAuthors = normalizeText((candidate.authors ?? []).join(' '));
  const bookAuthorWords = significantWords(book.author);
  const authorMatch = !candidateAuthors || !bookAuthorWords.length
    ? null
    : bookAuthorWords.some((w) => candidateAuthors.includes(w));

  const bookTitleNorm = normalizeText(book.title);
  const editionMismatch = EDITION_MARKERS.filter(
    (m) => candidateTitle.includes(m) !== bookTitleNorm.includes(m),
  );

  const reasons = [];
  if (isbnMatch === true) reasons.push('ISBN matches');
  if (isbnMatch === false) reasons.push('Different ISBN');
  if (!titleMatch) reasons.push('Series/title does not match');
  if (volumeMatch === true) reasons.push(`Volume ${bookVolume} matches`);
  if (volumeMatch === false) reasons.push(`Catalogue says volume ${candidateVolume}, book is volume ${bookVolume}`);
  if (volumeMatch === null && bookVolume != null) reasons.push('Volume number not confirmed');
  if (authorMatch === false) reasons.push('Author does not match');
  if (editionMismatch.length) reasons.push(`Edition differs (${editionMismatch.join(', ')})`);

  let verdict = 'mismatch';
  if (titleMatch && volumeMatch !== false && authorMatch !== false && !editionMismatch.length) {
    // Strong = the catalogue confirms both the series and the specific volume
    // (either via the ISBN or via an explicit volume number in its title).
    verdict = isbnMatch === true || volumeMatch === true ? 'strong' : 'weak';
  } else if (titleMatch && volumeMatch !== false) {
    verdict = 'weak';
  }

  return { verdict, isbnMatch, titleMatch, volumeMatch, authorMatch, editionMismatch, reasons };
};

// ---- Open Library ---------------------------------------------------------

const OL = 'https://openlibrary.org';
const olCover = (id, size) => `https://covers.openlibrary.org/b/id/${id}-${size}.jpg`;

const olEditionToCandidate = (edition) => {
  const coverId = (edition.covers ?? []).find((c) => c > 0);
  if (!coverId) return null;
  return {
    source: 'Open Library',
    sourceUrl: `${OL}${edition.key}`,
    title: [edition.title, edition.subtitle].filter(Boolean).join(': '),
    authors: edition.by_statement ? [edition.by_statement] : [],
    publisher: (edition.publishers ?? []).join(', '),
    publishedDate: edition.publish_date ?? '',
    language: (edition.languages ?? []).map((l) => l.key.split('/').pop()).join(', '),
    isbns: [...(edition.isbn_13 ?? []), ...(edition.isbn_10 ?? [])],
    coverUrl: olCover(coverId, 'L'),
    thumbnailUrl: olCover(coverId, 'M'),
  };
};

const olByIsbn = async (isbn) => {
  const edition = await fetchJson(`${OL}/isbn/${isbn}.json`);
  return edition ? olEditionToCandidate(edition) : null;
};

// Manga volumes are often filed under their Japanese work title, so a general
// query ("q") finds them where a title-only search doesn't. Several phrasings
// ("Blue Lock 1", "Blue Lock Vol. 1") are tried together.
const olSearch = async (queries) => {
  const pages = await Promise.all(queries.map((q) => {
    const params = new URLSearchParams({ q, fields: 'title,author_name,isbn', limit: '6' });
    return fetchJson(`${OL}/search.json?${params}`);
  }));
  const docs = pages.flatMap((page) => page?.docs ?? []);

  // A search hit is a *work*; its cover may be from any language edition. Resolve
  // a couple of English-language ISBNs (978-0 / 978-1) per work to get the
  // edition-specific cover instead.
  const isbns = [...new Set(
    docs.flatMap((d) => (d.isbn ?? []).filter((i) => /^97[89][01]\d{9}$/.test(i)).slice(0, 2)),
  )].slice(0, 8);

  const results = await Promise.allSettled(isbns.map(async (isbn) => {
    const candidate = await olByIsbn(isbn);
    if (candidate) {
      const doc = docs.find((d) => d.isbn?.includes(isbn));
      if (doc?.author_name?.length) candidate.authors = doc.author_name;
    }
    return candidate;
  }));
  return results.filter((r) => r.status === 'fulfilled' && r.value).map((r) => r.value);
};

// ---- Google Books ---------------------------------------------------------

const googleSearch = async ({ isbn, title, author }) => {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  const q = isbn
    ? `isbn:${isbn}`
    : [`intitle:${title}`, author ? `inauthor:${author.split(/[&,]/)[0].trim()}` : ''].filter(Boolean).join('+');
  const params = new URLSearchParams({ q, maxResults: '10', printType: 'books' });
  if (key) params.set('key', key);
  const data = await fetchJson(`https://www.googleapis.com/books/v1/volumes?${params}`);

  return (data?.items ?? [])
    .map((item) => {
      const info = item.volumeInfo ?? {};
      const links = info.imageLinks ?? {};
      const raw = links.extraLarge || links.large || links.medium || links.thumbnail || links.smallThumbnail;
      if (!raw) return null;
      const cover = raw.replace(/^http:/, 'https:').replace(/&edge=curl/, '');
      return {
        source: 'Google Books',
        sourceUrl: info.infoLink ?? '',
        title: [info.title, info.subtitle].filter(Boolean).join(': '),
        authors: info.authors ?? [],
        publisher: info.publisher ?? '',
        publishedDate: info.publishedDate ?? '',
        language: info.language ?? '',
        isbns: (info.industryIdentifiers ?? []).map((x) => x.identifier),
        coverUrl: cover,
        thumbnailUrl: (links.thumbnail ?? cover).replace(/^http:/, 'https:').replace(/&edge=curl/, ''),
      };
    })
    .filter(Boolean);
};

// ---- Public API -----------------------------------------------------------

const VERDICT_RANK = { strong: 0, weak: 1, mismatch: 2 };

/**
 * Looks up cover candidates for `book` ({ title, author, isbn, series, volumeNumber }).
 * Returns every candidate with its match assessment, best first, plus any
 * per-source errors so callers can report partial failures honestly.
 */
export const findCoverCandidates = async (book) => {
  const isbn = isValidIsbn(book.isbn) ? normalizeIsbn(book.isbn) : null;
  const series = book.series || parseSeries(book.title);
  const volume = book.volumeNumber ?? parseVolumeNumber(book.title);
  const searchTitle = volume != null ? `${series} ${volume}` : book.title;

  const jobs = {
    'Open Library (ISBN)': isbn ? olByIsbn(isbn).then((c) => (c ? [c] : [])) : Promise.resolve([]),
    'Open Library (title)': olSearch(
      volume != null ? [`${series} ${volume}`, `${series} Vol. ${volume}`] : [book.title],
    ),
    'Google Books (ISBN)': isbn ? googleSearch({ isbn }) : Promise.resolve([]),
    'Google Books (title)': googleSearch({ title: searchTitle, author: book.author }),
  };

  const names = Object.keys(jobs);
  const settled = await Promise.allSettled(Object.values(jobs));
  const errors = [];
  const seen = new Set();
  const candidates = [];

  settled.forEach((result, i) => {
    if (result.status === 'rejected') {
      errors.push(`${names[i]}: ${result.reason?.message ?? 'request failed'}`);
      return;
    }
    for (const candidate of result.value) {
      if (seen.has(candidate.coverUrl)) continue;
      seen.add(candidate.coverUrl);
      candidates.push({ ...candidate, match: assessMatch(book, candidate) });
    }
  });

  candidates.sort((a, b) => VERDICT_RANK[a.match.verdict] - VERDICT_RANK[b.match.verdict]
    || Number(b.match.isbnMatch === true) - Number(a.match.isbnMatch === true));

  return { candidates, errors, isbnValid: Boolean(isbn) };
};

/**
 * Checks that a stored cover reference actually resolves to an image.
 * Remote URLs are fetched; /uploads/covers/... paths are checked on disk.
 *
 * `transient: true` means the check could not reach a verdict (timeout, DNS,
 * connection reset, 429/5xx). Callers must not delete a cover on a transient
 * failure, otherwise one slow response would wipe a working image.
 */
export const checkCoverReference = async (ref) => {
  if (!ref) return { ok: false, reason: 'missing' };
  if (ref.startsWith('/uploads/')) {
    try {
      await access(path.join(UPLOADS_ROOT, ref.replace(/^\/uploads\//, '')));
      return { ok: true };
    } catch {
      return { ok: false, reason: 'uploaded file not found on disk' };
    }
  }
  try {
    const res = await fetchWithTimeout(ref);
    const type = res.headers.get('content-type') ?? '';
    const bytes = (await res.arrayBuffer()).byteLength;
    if (!res.ok) {
      const transient = res.status === 429 || res.status >= 500;
      return { ok: false, transient, reason: `HTTP ${res.status}` };
    }
    if (!type.startsWith('image/')) return { ok: false, reason: `not an image (${type || 'no content-type'})` };
    // Open Library and others answer missing covers with a 1x1 placeholder.
    if (bytes < 1000) return { ok: false, reason: `placeholder image (${bytes} bytes)` };
    return { ok: true, bytes, contentType: type };
  } catch (error) {
    return { ok: false, transient: true, reason: error.name === 'AbortError' ? 'timed out' : error.message };
  }
};
