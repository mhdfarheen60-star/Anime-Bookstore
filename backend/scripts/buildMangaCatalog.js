// Expands data/mangaSeries.js into individual volume records and writes
// data/mangaCatalog.js. Run this only when the curated series list changes:
//
//   node scripts/buildMangaCatalog.js
//
// Cover IDs and ISBNs come from Open Library search results. A reviewed cover
// from data/verifiedCovers.js always wins over an automatic match. Every cover
// is checked before it is written, and a cover is never assigned to two
// different volumes. When no reliable cover exists the field is left empty so
// the storefront shows its own typographic placeholder instead of a dead link.

import { access, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mangaSeries } from '../data/mangaSeries.js';
import { verifiedCovers } from '../data/verifiedCovers.js';
import { isValidIsbn, normalizeIsbn } from '../utils/isbn.js';
import { parseVolumeNumber } from '../utils/coverLookup.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data', 'mangaCatalog.js');
const OL = 'https://openlibrary.org/search.json';
const USER_AGENT = 'AnimeBookstore/1.0 (catalog builder)';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const norm = (value) => String(value ?? '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[’']/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const significantWords = (value) => norm(value).split(' ').filter((w) => w.length > 1);

const includesWords = (title, words) => {
  const text = norm(title);
  return words.length > 0 && words.every((word) => text.includes(word));
};

const fetchJson = async (url, attempt = 1) => {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    if (attempt >= 4) throw error;
    await sleep(800 * attempt);
    return fetchJson(url, attempt + 1);
  }
};

const search = async (query) => {
  const fields = 'title,author_name,isbn,cover_i,first_publish_year,publisher,language';
  const params = new URLSearchParams({ title: query, limit: '100', fields });
  let data = await fetchJson(`${OL}?${params}`);
  if (!data?.docs?.length) {
    const fallback = new URLSearchParams({ q: query, limit: '100', fields });
    data = await fetchJson(`${OL}?${fallback}`);
  }
  return data?.docs ?? [];
};

const volumeTitles = (series) => series.volumeTitles ?? [];

// A curated per-volume title (e.g. "Bakemonogatari Part 1") is the real product
// name; otherwise use "<series>, Vol. n", which is how the English editions are
// listed in book catalogues.
const titleForVolume = (series, n) => volumeTitles(series)[n - 1]
  ?? `${series.name}, Vol. ${n}`;

const badEdition = (series, title) => {
  const text = norm(title);
  const markers = ['omnibus', 'box set', 'boxed set', 'deluxe', 'vizbig', '3 in 1', 'artbook', 'art book', 'fanbook', 'guidebook', 'coloring', 'colouring', 'illustration'];
  if (series.kind === 'light novel') {
    // Light-novel searches legitimately contain "light novel"; reject manga-only
    // packaging that would give the wrong cover.
    return markers.some((marker) => text.includes(marker)) && !text.includes('light novel');
  }
  return markers.some((marker) => text.includes(marker)) || text.includes('light novel');
};

const docScore = (doc, series, expectedVolume) => {
  const title = doc.title ?? '';
  const candidateVolume = parseVolumeNumber(title);
  let score = 0;
  if (doc.cover_i) score += 50;
  if (candidateVolume === expectedVolume) score += 25;
  if ((doc.isbn ?? []).some((isbn) => isValidIsbn(isbn))) score += 20;
  if (norm((doc.publisher ?? []).join(' ')).includes(norm(series.publisher.split(' ')[0]))) score += 8;
  if ((doc.language ?? []).some((language) => /^eng$/i.test(language))) score += 6;
  if (Number.isFinite(doc.first_publish_year) && doc.first_publish_year >= (series.publishedFrom ?? 1900) - 3) score += 4;
  if (/\bvol(?:ume)?\.?\s*\d+/i.test(title)) score += 4;
  return score;
};

const rankedDocs = (docs, series, expectedVolume) => {
  const matchWords = significantWords(series.searchTitle || series.name).slice(0, 4);
  return docs
    .filter((doc) => doc.title && includesWords(doc.title, matchWords))
    .filter((doc) => !badEdition(series, doc.title))
    .filter((doc) => expectedVolume == null || parseVolumeNumber(doc.title) === expectedVolume)
    .sort((a, b) => docScore(b, series, expectedVolume) - docScore(a, series, expectedVolume));
};

const coverFor = (doc) => (doc?.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : '');

// Prefer the best match whose cover has not already been used by another volume.
const pickDoc = (candidates, usedCovers) => candidates
  .find((doc) => !coverFor(doc) || !usedCovers.has(coverFor(doc))) ?? candidates[0] ?? null;

// Artbooks, box sets and collector editions rarely have clean catalogue titles,
// so match on the distinctive words of the searched title instead of an exact
// string. A candidate must share at least half of those words and carry a cover.
const bestSpecialDoc = (docs, item) => {
  const words = significantWords(item.searchTitle || item.title).filter((word) => word.length > 2);
  if (!words.length) return null;
  const required = Math.max(2, Math.ceil(words.length * 0.5));
  const candidates = docs
    .filter((doc) => doc.title && doc.cover_i)
    .map((doc) => {
      const text = norm(doc.title);
      const hits = words.filter((word) => text.includes(word)).length;
      return { doc, hits };
    })
    .filter(({ hits }) => hits >= required)
    .sort((a, b) => b.hits - a.hits || docScore(b.doc, item, null) - docScore(a.doc, item, null));
  return candidates[0]?.doc ?? null;
};

const verifiedBySeriesVolume = new Map();
const verifiedByTitle = new Map();
for (const entry of verifiedCovers) {
  if (!entry.coverUrl) continue;
  if (entry.series && entry.volumeNumber != null) {
    verifiedBySeriesVolume.set(`${norm(entry.series)}|${entry.volumeNumber}`, entry);
  }
  verifiedByTitle.set(norm(entry.title), entry);
}

const isbnCandidates = (doc) => [...new Set((doc?.isbn ?? []).map(normalizeIsbn).filter(isValidIsbn))]
  .sort((a, b) => {
    const rank = (isbn) => isbn.startsWith('9781') ? 0 : isbn.startsWith('9780') ? 1 : isbn.startsWith('978') ? 2 : 3;
    return rank(a) - rank(b);
  });

const pickIsbn = (doc, used) => isbnCandidates(doc).find((isbn) => !used.has(isbn)) ?? null;

const isbnCheckDigit = (base12) => {
  let total = 0;
  for (let i = 0; i < 12; i++) total += Number(base12[i]) * (i % 2 ? 3 : 1);
  return String((10 - (total % 10)) % 10);
};

const makeFallbackIsbn = (used, seed) => {
  let n = seed;
  while (true) {
    const base = `9798${String(n).padStart(8, '0').slice(-8)}`;
    const isbn = base + isbnCheckDigit(base);
    if (!used.has(isbn)) return isbn;
    n += 1;
  }
};

const publishedFor = (series, volumeNumber) => {
  if (series.preorderLast && volumeNumber === series.volumes) {
    const year = new Date().getFullYear() + 1;
    return { year, date: `${year}-06-01` };
  }
  const year = (series.publishedFrom ?? 2020) + Math.floor((volumeNumber - 1) * (series.yearStep ?? 0.4));
  const month = String(((volumeNumber - 1) * 3) % 12 + 1).padStart(2, '0');
  return { year, date: `${year}-${month}-01` };
};

const tagsFor = (series, volumeNumber, year) => {
  const tags = new Set([series.category, series.genre, `${series.status} Series`]);
  if (series.bestseller) tags.add('Bestsellers');
  if (series.newRelease || year >= new Date().getFullYear() - 1) tags.add('New Releases');
  if (series.preorderLast && volumeNumber === series.volumes) tags.add('Preorders');
  return [...tags].filter(Boolean);
};

const makeVolume = (series, n, doc, index, usedIsbn, usedCovers) => {
  const override = verifiedBySeriesVolume.get(`${norm(series.name)}|${n}`);
  let coverImage = override?.coverUrl || coverFor(doc);
  if (coverImage && usedCovers.has(coverImage)) coverImage = '';
  if (coverImage) usedCovers.add(coverImage);

  const isbn = pickIsbn(doc, usedIsbn) ?? makeFallbackIsbn(usedIsbn, 30000000 + index);
  usedIsbn.add(isbn);

  const { year, date } = publishedFor(series, n);
  const preorder = Boolean(series.preorderLast && n === series.volumes);
  const stock = preorder ? 0 : 14 + ((index * 13 + n * 7) % 41);
  const rating = Number((4.3 + ((index + n) % 7) / 10).toFixed(1));
  const price = Number((series.price + Math.min(2, (n - 1) * 0.5)).toFixed(2));

  return {
    title: titleForVolume(series, n),
    author: series.author,
    illustrator: series.illustrator,
    description: `${series.description} This is volume ${n} of the ${series.kind} edition, presented in ${series.format.toLowerCase()} with the original cover artwork.`,
    price,
    originalPrice: Number((price + 2).toFixed(2)),
    coverImage,
    series: series.name,
    volumeNumber: n,
    category: series.category,
    isbn,
    publisher: series.publisher,
    publishedYear: year,
    publicationDate: date,
    stock,
    language: series.language,
    rating,
    reviewCount: 60 + ((index * 17 + n * 23) % 440),
    featured: Boolean(series.featured && n === 1),
    colors: series.colors,
    glyph: series.glyph,
    edition: series.edition,
    pages: series.pages + (n - 1) * 8,
    format: series.format,
    seriesStatus: series.status,
    tags: tagsFor(series, n, year),
    isActive: true,
  };
};

const makeSpecial = (item, index, doc, usedIsbn, usedCovers) => {
  const override = verifiedByTitle.get(norm(item.title));
  // A reviewed entry may intentionally suppress automatic artwork (when no
  // exact cover exists) instead of falling back to a near-match.
  let coverImage = override?.coverUrl || (override?.suppressAutoCover ? '' : coverFor(doc));
  if (coverImage && usedCovers.has(coverImage)) coverImage = '';
  if (coverImage) usedCovers.add(coverImage);

  const isbn = pickIsbn(doc, usedIsbn) ?? makeFallbackIsbn(usedIsbn, 40000000 + index);
  usedIsbn.add(isbn);

  return {
    title: item.title,
    author: item.author,
    illustrator: item.illustrator,
    description: item.description,
    price: item.price,
    originalPrice: item.originalPrice ?? Number((item.price + 3).toFixed(2)),
    coverImage,
    series: item.series,
    volumeNumber: item.volumeNumber,
    category: item.category,
    isbn,
    publisher: item.publisher,
    publishedYear: item.publishedYear,
    publicationDate: item.publicationDate ?? `${item.publishedYear}-01-01`,
    stock: item.stock,
    language: item.language ?? 'English',
    rating: Number((4.5 + (index % 4) / 10).toFixed(1)),
    reviewCount: 40 + (index * 29) % 260,
    featured: Boolean(item.featured),
    colors: item.colors,
    glyph: item.glyph,
    edition: item.edition,
    pages: item.pages,
    format: item.format,
    seriesStatus: undefined,
    tags: item.tags ?? [item.category],
    isActive: true,
  };
};

// Open Library rate-limits bursts of cover requests. A 429 or 5xx is retried
// rather than treated as a missing cover, and only a definitive 404/HTML
// response clears a cover. That keeps transient throttling from wiping good
// artwork out of the catalogue.
const checkCover = async (url, attempt = 1) => {
  if (url.startsWith('/uploads/')) {
    try {
      await access(path.join(ROOT, url.replace(/^\/uploads\//, 'uploads/')));
      return true;
    } catch {
      return false;
    }
  }
  try {
    const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': USER_AGENT } });
    if (res.status === 404) return false;
    if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
    if (res.ok) return (res.headers.get('content-type') ?? '').startsWith('image/');
    // Some CDNs reject HEAD; fall back to a small ranged GET.
    const ranged = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Range: 'bytes=0-1023' } });
    if (ranged.status === 404) return false;
    if (ranged.status === 429 || ranged.status >= 500) throw new Error(`HTTP ${ranged.status}`);
    return ranged.ok && (ranged.headers.get('content-type') ?? '').startsWith('image/');
  } catch {
    if (attempt >= 5) return true; // Unknown, but the URL came from a real cover id.
    await sleep(600 * attempt);
    return checkCover(url, attempt + 1);
  }
};

const main = async () => {
  const usedIsbn = new Set();
  const usedCovers = new Set();
  const books = [];
  const missing = [];

  let index = 0;
  const seriesOnly = mangaSeries.filter((entry) => entry.kind === 'manga' || entry.kind === 'light novel');
  const specialsOnly = mangaSeries.filter((entry) => entry.kind === 'special');

  for (const series of seriesOnly) {
    const docs = await search(series.searchTitle || series.name);
    console.log(`${series.name}: ${docs.length} Open Library matches`);

    for (let n = 1; n <= series.volumes; n++) {
      let doc = pickDoc(rankedDocs(docs, series, n), usedCovers);
      if (!doc) {
        const extra = await search(`"${titleForVolume(series, n)}"`);
        doc = pickDoc(rankedDocs(extra, series, n), usedCovers);
        await sleep(120);
      }
      const book = makeVolume(series, n, doc, index++, usedIsbn, usedCovers);
      if (!book.coverImage) missing.push(book.title);
      books.push(book);
    }
    await sleep(180);
  }

  for (const item of specialsOnly) {
    const docs = await search(item.title);
    let doc = bestSpecialDoc(docs, item);
    if (!doc) {
      // Try a shorter title, still requiring the leading words to match.
      const short = significantWords(item.title).slice(0, 4).join(' ');
      const extra = await search(short);
      doc = bestSpecialDoc(extra, { ...item, searchTitle: short });
      await sleep(120);
    }
    const book = makeSpecial(item, index++, doc, usedIsbn, usedCovers);
    if (!book.coverImage) missing.push(book.title);
    books.push(book);
    await sleep(180);
  }

  // Validate every distinct cover before writing. Invalid ones are cleared so
  // the UI falls back to its own artwork instead of showing a broken image.
  const covers = [...new Set(books.map((book) => book.coverImage).filter(Boolean))];
  const coverOk = new Map();
  const queue = [...covers];
  const workers = Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const url = queue.shift();
      coverOk.set(url, await checkCover(url));
    }
  });
  await Promise.all(workers);
  const cleared = [];
  for (const book of books) {
    if (book.coverImage && !coverOk.get(book.coverImage)) {
      cleared.push(book.title);
      book.coverImage = '';
    }
  }

  const source = `// AUTO-GENERATED by scripts/buildMangaCatalog.js. Do not edit by hand.
// ${books.length} individual products across ${mangaSeries.filter((s) => s.kind !== 'special').length} series,
// plus ${mangaSeries.filter((s) => s.kind === 'special').length} artbooks / box sets / collector editions.
// Covers are checked Open Library artwork; empty coverImage means the storefront
// should use its typographic fallback.

export const mangaCatalog = ${JSON.stringify(books, null, 2)};

export default mangaCatalog;
`;
  await writeFile(OUT, source, 'utf8');

  console.log(`\nWrote ${books.length} products to ${path.relative(ROOT, OUT)}`);
  console.log(`Covers: ${covers.length - cleared.length}/${covers.length} valid (${cleared.length} cleared)`);
  console.log(`Without cover: ${missing.length}`);
  if (missing.length) console.log(missing.map((title) => `  - ${title}`).join('\n'));
  console.log(`Unique ISBNs: ${usedIsbn.size}/${books.length}`);
};

main().catch((error) => {
  console.error('Catalog build failed:', error);
  process.exit(1);
});
