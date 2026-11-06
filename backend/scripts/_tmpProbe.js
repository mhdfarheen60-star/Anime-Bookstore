import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { writeFile } from 'node:fs/promises';
import Book from '../models/Book.js';
import { normalizeIsbn } from '../utils/isbn.js';
import { parseVolumeNumber, parseSeries } from '../utils/coverLookup.js';

dotenv.config();

const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 0);
const UA = 'AnimeBookstore/1.0 (cover verification)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const norm = (v) => String(v ?? '')
  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[’']/g, '')
  .replace(/[^a-z0-9]+/g, ' ').trim();

const words = (v) => norm(v).split(' ').filter((w) => w.length > 1 && !['the', 'of', 'no', 'a', 'an', 'and', 'to', 'in', 'is', 'for'].includes(w));
const levenshtein = (a, b) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length][b.length];
};
const authorMatch = (bookAuthor, docAuthors) => {
  const authors = (docAuthors ?? []).join(' ').toLowerCase();
  if (!authors) return null;
  const bookWords = words(bookAuthor);
  const candWords = words(docAuthors?.join(' '));
  for (const bw of bookWords) {
    for (const cw of candWords) {
      if (bw === cw || (bw.length > 4 && cw.length > 4 && levenshtein(bw, cw) <= 1)) return true;
    }
  }
  return false;
};

const BAD_MARKERS = ['omnibus', 'box set', 'boxed set', 'deluxe', 'vizbig', '3 in 1', '2 in 1', 'artbook', 'art book', 'fanbook', 'guidebook', 'coloring', 'colouring', 'illustration', 'calendar', 'notebook', 'journal', 'perfect edition', 'collector', 'anniversary', 'master edition', 'big edition', 'library edition', 'slipcase'];

const fetchJson = async (url, attempt = 1) => {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) });
    if (res.status === 404) return null;
    if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    if (attempt >= 4) throw e;
    await sleep(500 * attempt);
    return fetchJson(url, attempt + 1);
  }
};

const search = async (params) => {
  const qs = new URLSearchParams({ fields: 'key,title,author_name,cover_i,cover_edition_key,edition_key,isbn,language,publisher,first_publish_year', limit: '12', ...params });
  const data = await fetchJson(`https://openlibrary.org/search.json?${qs}`);
  return data?.docs ?? [];
};

const editionsCache = new Map();
const editionsFor = async (workKey) => {
  if (editionsCache.has(workKey)) return editionsCache.get(workKey);
  const data = await fetchJson(`https://openlibrary.org${workKey}/editions.json?limit=100`);
  const entries = data?.entries ?? [];
  editionsCache.set(workKey, entries);
  await sleep(80);
  return entries;
};

const bookVolume = (book) => book.volumeNumber ?? parseVolumeNumber(book.title);
const bookSeries = (book) => book.series || parseSeries(book.title);

const badForBook = (book, text) => {
  const t = norm(text);
  const bt = norm(book.title);
  return BAD_MARKERS.filter((m) => t.includes(m) && !bt.includes(m));
};

const candidateFromEdition = (book, edition, work, doc) => {
  const coverId = (edition.covers ?? []).find((c) => c > 0) ?? (work.covers ?? []).find((c) => c > 0) ?? doc.cover_i;
  if (!coverId) return null;
  const text = `${edition.title ?? ''} ${edition.subtitle ?? ''}`;
  const bad = badForBook(book, `${text} ${work.title ?? ''}`);
  if (bad.length) return null;

  const series = bookSeries(book);
  const seriesWords = words(series);
  const titleText = norm(`${text} ${work.title ?? ''} ${doc.title ?? ''}`);
  const seriesHit = seriesWords.length > 0 && seriesWords.every((w) => titleText.includes(w));
  const exactTitle = norm(doc.title) === norm(book.title) || norm(`${work.title} ${work.subtitle ?? ''}`) === norm(book.title);
  const author = authorMatch(book.author, [edition.by_statement, ...(doc.author_name ?? [])].filter(Boolean));
  const language = (edition.languages ?? []).map((l) => l.key).join(' ');
  const isEnglish = language.includes('/eng') || (!language && /viz|yen|kodansha|seven seas|dark horse|square enix|one peace|denpa|vertical/i.test(edition.publishers?.join(' ') ?? ''));
  const isbnList = [...(edition.isbn_13 ?? []), ...(edition.isbn_10 ?? [])];
  const isbnMatch = Boolean(book.isbn) && isbnList.some((i) => normalizeIsbn(i) === normalizeIsbn(book.isbn));
  const publisherHit = Boolean(book.publisher) && (edition.publishers ?? []).some((p) => norm(p).includes(norm(book.publisher.split(' ')[0])));

  // A volume number is only usable when the record states one explicitly (or
  // when the work is clearly this series, for Japanese-titled editions).
  const explicit = (value) => {
    const m = String(value ?? '').match(/\b(?:vol(?:ume)?|book|part|no|#)\.?\s*(\d{1,3})\b/i);
    return m ? Number(m[1]) : null;
  };
  const trustedText = seriesHit || author === true;
  const volume = (Number.isInteger(edition.volume) ? edition.volume : null)
    ?? explicit(text)
    ?? explicit(work.title)
    ?? (trustedText ? parseVolumeNumber(text) ?? parseVolumeNumber(work.title) : null);
  const expected = bookVolume(book);
  if (expected != null && volume != null && volume !== expected) return null;
  // If the work/doc name says a different volume, never use it.
  const workVolume = explicit(work.title) ?? explicit(doc.title);
  if (expected != null && workVolume != null && workVolume !== expected) return null;
  // Hard gate: the cover must belong to this series/edition, never just a
  // same-author/same-volume coincidence.
  if (!seriesHit && !exactTitle && !isbnMatch) return null;
  // The store sells English editions; a Japanese-only cover is the wrong
  // edition unless the ISBN itself matched.
  if (!isEnglish && !isbnMatch) return null;

  return { coverId, volume, author, seriesHit, exactTitle, isEnglish, isbnMatch, publisherHit, text: text.trim(), work: work.title, doc: doc.title, isbnList };
};

const findFor = async (book) => {
  const series = bookSeries(book);
  const volume = bookVolume(book);
  const queries = [];
  if (volume != null) {
    queries.push({ q: `${series} ${volume}` }, { q: `${series} vol ${volume}` });
  }
  const isbnDigits = String(book.isbn ?? '').replace(/[^0-9Xx]/g, '');
  if (isbnDigits.length === 10 || isbnDigits.length === 13) queries.push({ q: isbnDigits });
  queries.push({ title: book.title.replace(/,\s*vol\.?\s*\d+.*$/i, '').trim() });
  queries.push({ q: book.title }, { q: series });
  if (book.author) queries.push({ q: `${series} ${book.author.split(/[&,]/)[0].trim()}` });

  const docs = [];
  const seen = new Set();
  for (const q of queries) {
    try {
      const results = await search(q);
      for (const d of results) if (!seen.has(d.key)) { seen.add(d.key); docs.push(d); }
    } catch (e) { /* ignore */ }
    await sleep(100);
  }

  const candidates = [];
  const seriesWords = words(series);
  const isbnNorm = normalizeIsbn(book.isbn);
  const plausible = docs.filter((doc) => {
    const titleText = norm(doc.title);
    const seriesHit = seriesWords.length > 0 && seriesWords.every((w) => titleText.includes(w));
    const exactTitle = norm(doc.title) === norm(book.title);
    const authorOk = authorMatch(book.author, doc.author_name) === true;
    const isbnHit = isbnNorm && (doc.isbn ?? []).some((i) => normalizeIsbn(i) === isbnNorm);
    const docVolume = parseVolumeNumber(doc.title);
    const volOk = volume == null || docVolume == null || docVolume === volume;
    // Localised works often carry a Japanese title and a Japanese author name,
    // so Latin-script checks cannot be the only way in. Their editions still
    // contain the English record that the strict edition matcher checks.
    const localisedTitle = /[^\u0000-\u024F]/.test(String(doc.title ?? ''));
    return volOk && (isbnHit || exactTitle || seriesHit || localisedTitle || authorOk);
  });

  for (const doc of plausible) {
    const work = doc;
    const editions = await editionsFor(doc.key);
    const editionCandidates = editions.map((e) => candidateFromEdition(book, e, work, doc)).filter(Boolean);
    if (!editionCandidates.length) {
      const fallback = candidateFromEdition(book, { covers: doc.cover_i ? [doc.cover_i] : [], title: doc.title }, work, doc);
      if (fallback) editionCandidates.push({ ...fallback, fallback: true });
    }
    for (const c of editionCandidates) {
      let score = 0;
      if (c.isbnMatch) score += 100;
      if (c.volume != null && volume != null && c.volume === volume) score += 50;
      else if (volume != null && c.volume == null) score -= 15;
      else if (volume == null) score += 5;
      if (c.seriesHit) score += 30;
      if (c.exactTitle) score += 25;
      if (c.author === true) score += 20;
      else if (c.author === false) score -= 5;
      if (c.isEnglish) score += 25;
      if (c.publisherHit) score += 10;
      if (doc.cover_i === c.coverId) score += 3;
      if (c.fallback) score -= 20;
      if (score >= 60) candidates.push({ ...c, score, docKey: doc.key, workTitle: doc.title, source: 'Open Library' });
    }
  }
  candidates.sort((a, b) => b.score - a.score || Number(a.fallback) - Number(b.fallback));
  return { book, series, volume, docs: docs.slice(0, 5).map((d) => ({ key: d.key, title: d.title, cover: d.cover_i })), candidates: candidates.slice(0, 6) };
};

const main = async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  const all = await Book.find({ $or: [{ coverImage: { $exists: false } }, { coverImage: '' }] }).sort({ series: 1, volumeNumber: 1, title: 1 }).lean();
  const books = LIMIT ? all.slice(0, LIMIT) : all;
  console.log(`Probing ${books.length} coverless books`);
  const out = [];
  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    try {
      const result = await findFor(book);
      const best = result.candidates[0];
      out.push(result);
      console.log(`[${i + 1}/${books.length}] ${book.title} -> ${best ? `cover ${best.coverId} score ${best.score} eng=${best.isEnglish} isbn=${best.isbnMatch} vol=${best.volume} | ${best.text}` : 'NO CANDIDATE'}`);
    } catch (e) {
      console.log(`[${i + 1}/${books.length}] ${book.title} -> ERROR ${e.message}`);
      out.push({ book, error: e.message });
    }
    await sleep(250);
  }
  await writeFile(new URL('../reports/_cover-probe.json', import.meta.url), JSON.stringify(out, null, 2));
  console.log('Wrote reports/_cover-probe.json');
  await mongoose.disconnect();
};

main().catch(async (e) => { console.error(e); await mongoose.disconnect().catch(() => {}); process.exit(1); });
