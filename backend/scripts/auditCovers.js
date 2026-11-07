// Audits every book's cover and (optionally) fixes it, without creating or
// deleting any books. This is the reusable cover audit/fix tool used by
// `npm run covers`.
//
//   node scripts/auditCovers.js                 audit only: report, change nothing
//   node scripts/auditCovers.js --fix           apply the reviewed fixes
//   node scripts/auditCovers.js --fix --cache   also download reviewed remote
//        covers to backend/uploads/covers and store the local path
//   node scripts/auditCovers.js --fix --auto
//        also assign covers to books NOT in data/verifiedCovers.js, but only
//        when the book has no working cover and a catalogue result matches its
//        ISBN *and* its series/volume. Marked "auto-matched, not reviewed".
//   node scripts/auditCovers.js --fix --fix-isbn
//        also replace stored ISBNs that fail the ISBN checksum with the reviewed
//        catalogue ISBN from data/verifiedCovers.js
//
// Rules:
//   - Books are matched to reviewed entries by ISBN first, then title + author.
//   - A working cover is never replaced unless the reviewed entry says it was
//     checked and found wrong (replaceExisting).
//   - An entry with `clearExisting` and no `coverUrl` is a reviewed product for
//     which no correct cover exists; its wrong cover is cleared so the storefront
//     shows the neutral placeholder instead.
//   - Broken/invalid cover references are cleared so the UI never shows a dead
//     image. Only coverImage, series, volumeNumber (if empty) and, with
//     --fix-isbn, isbn are ever written. Nothing is deleted.
//
// Reports are written to backend/reports/ as JSON and Markdown.

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Book from '../models/Book.js';
import connectDB from '../config/db.js';
import { verifiedCovers, VERIFIED_ON } from '../data/verifiedCovers.js';
import { checkCoverReference, findCoverCandidates } from '../utils/coverLookup.js';
import { saveCoverImage, detectImageType } from '../utils/coverStorage.js';
import { normalizeIsbn, isValidIsbn } from '../utils/isbn.js';

dotenv.config();

const args = new Set(process.argv.slice(2));
const APPLY = args.has('--fix') || args.has('--apply');
const AUTO = args.has('--auto');
const CACHE = args.has('--cache');
const FIX_ISBN = args.has('--fix-isbn');

const REPORTS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'reports');
const NO_HOTLINK_HOSTS = [/(^|\.)amazon\.[a-z.]+$/i, /(^|\.)media-amazon\.com$/i, /(^|\.)ssl-images-amazon\.com$/i];
const USER_AGENT = 'AnimeBookstore/1.0 (cover audit)';
const COVER_PATH = /^\/uploads\/covers\/[\w.-]+$/;
const DOWNLOAD_TIMEOUT_MS = 20000;

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const hostOf = (url) => { try { return new URL(url).hostname; } catch { return ''; } };
const isNoHotlink = (url) => NO_HOTLINK_HOSTS.some((re) => re.test(hostOf(url)));
const isHttp = (ref) => /^https?:\/\//i.test(ref);
const isValidCoverRef = (ref) => isHttp(ref) || COVER_PATH.test(ref);
const cachedPrefix = (entry) => (entry?.cacheName ? `/uploads/covers/${entry.cacheName}.` : '');

const findEntry = (book) => {
  const isbn = normalizeIsbn(book.isbn);
  if (isbn) {
    const byIsbn = verifiedCovers.find((e) => [e.storedIsbn, e.catalogIsbn].some((i) => i && normalizeIsbn(i) === isbn));
    if (byIsbn) return { entry: byIsbn, matchedBy: 'ISBN' };
  }
  const byTitle = verifiedCovers.find((e) => norm(e.title) === norm(book.title) && norm(e.author) === norm(book.author));
  return byTitle ? { entry: byTitle, matchedBy: 'title + author' } : { entry: null, matchedBy: null };
};

// Downloads a reviewed cover and stores it locally, returning its public path.
const cacheCover = async (entry) => {
  const res = await fetch(entry.coverUrl, {
    headers: { 'User-Agent': USER_AGENT },
    redirect: 'follow',
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get('content-type') ?? '';
  const buffer = Buffer.from(await res.arrayBuffer());
  // Some CDNs return real image bytes without an image Content-Type; sniff them.
  if (!type.startsWith('image/') && !detectImageType(buffer)) {
    throw new Error(`not an image (${type || 'no content-type'})`);
  }
  if (buffer.length < 1000) throw new Error(`placeholder image (${buffer.length} bytes)`);
  const ref = await saveCoverImage(buffer, { name: entry.cacheName });
  const check = await checkCoverReference(ref);
  if (!check.ok) throw new Error(`saved file could not be read (${check.reason})`);
  return ref;
};

const checkAllCovers = async (refs, concurrency = 5) => {
  const checks = new Map();
  const queue = [...refs];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) {
      const ref = queue.shift();
      checks.set(ref, await checkCoverReference(ref));
    }
  });
  await Promise.all(workers);
  return checks;
};

const main = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set');
  await connectDB();

  const books = await Book.find({}).select('title author isbn coverImage series volumeNumber category').lean();
  console.log(`${APPLY ? 'APPLYING FIXES' : 'AUDIT ONLY (no changes)'} - ${books.length} books${CACHE ? ' (cache reviewed covers locally)' : ''}\n`);

  // How many books share each cover reference, and each ISBN.
  const coverUsage = new Map();
  const isbnUsage = new Map();
  for (const b of books) {
    if (b.coverImage) coverUsage.set(b.coverImage, (coverUsage.get(b.coverImage) ?? 0) + 1);
    const isbn = normalizeIsbn(b.isbn);
    if (isbn) isbnUsage.set(isbn, [...(isbnUsage.get(isbn) ?? []), b]);
  }

  // Check each distinct cover reference once.
  const coverChecks = await checkAllCovers([...coverUsage.keys()]);

  const report = {
    generatedAt: new Date().toISOString(),
    mode: APPLY ? 'fix' : 'audit',
    options: { auto: AUTO, cache: CACHE, fixIsbn: FIX_ISBN },
    reviewedOn: VERIFIED_ON,
    summary: {},
    missingCovers: [],
    invalidCoverReferences: [],
    brokenCoverUrls: [],
    unreachableCoverUrls: [],
    duplicateCovers: [],
    duplicateIsbns: [],
    hotlinkedCovers: [],
    remoteHosts: [],
    matched: [],
    updated: [],
    alreadyCorrect: [],
    keptExisting: [],
    withoutVerifiedCover: [],
    invalidIsbns: [],
    isbnCorrections: [],
    errors: [],
  };

  for (const book of books) {
    const id = String(book._id);
    const label = { id, title: book.title, isbn: book.isbn ?? '' };
    const current = book.coverImage || '';
    const check = current ? coverChecks.get(current) ?? { ok: false, transient: true, reason: 'not checked' } : { ok: false, reason: 'missing' };
    const shared = Boolean(current && coverUsage.get(current) > 1);
    const definitelyBroken = Boolean(current && isValidCoverRef(current) && !check.ok && !check.transient);
    const { entry, matchedBy } = findEntry(book);

    const set = {};
    const unset = {};
    let action = null;

    if (!current) report.missingCovers.push(label);
    if (current && !isValidCoverRef(current)) report.invalidCoverReferences.push({ ...label, url: current });
    if (definitelyBroken) report.brokenCoverUrls.push({ ...label, url: current, reason: check.reason });
    else if (current && isValidCoverRef(current) && !check.ok) report.unreachableCoverUrls.push({ ...label, url: current, reason: check.reason });
    if (current && isNoHotlink(current)) report.hotlinkedCovers.push({ ...label, url: current, host: hostOf(current) });
    if (book.isbn && !isValidIsbn(book.isbn)) report.invalidIsbns.push({ ...label, isbn: book.isbn });
    if (entry) report.matched.push({ ...label, matchedBy, verifiedOn: entry.verifiedOn ?? VERIFIED_ON, note: entry.note });

    // Cover fixes deliberately leave every other book field untouched.
    const prefix = cachedPrefix(entry);
    const alreadyCached = Boolean(prefix && current.startsWith(prefix) && check.ok);

    if (entry?.coverUrl) {
      // Decide whether the reviewed cover should replace what is stored.
      const needsUpdate = !current || definitelyBroken || shared || entry.replaceExisting;
      let targetRef = entry.coverUrl;

      if (CACHE && entry.cacheName && needsUpdate && !alreadyCached) {
        try {
          targetRef = await cacheCover(entry);
        } catch (error) {
          report.errors.push({ ...label, message: `Could not cache reviewed cover (${error.message}); using the remote URL`, url: entry.coverUrl });
          targetRef = entry.coverUrl;
        }
      } else if (alreadyCached) {
        targetRef = current;
      }

      const target = await checkCoverReference(targetRef);
      if (!target.ok) {
        report.errors.push({ ...label, message: `Reviewed cover did not load (${target.reason}); left unchanged`, url: targetRef });
      } else if (current === targetRef) {
        report.alreadyCorrect.push({ ...label, url: current, cached: alreadyCached });
      } else if (needsUpdate) {
        set.coverImage = targetRef;
        const why = !current ? 'no cover' : definitelyBroken ? `current cover broken (${check.reason})`
          : shared ? `current cover shared by ${coverUsage.get(current)} books`
          : 'current cover reviewed and found wrong or not permitted';
        action = {
          ...label, from: current || null, to: targetRef,
          reason: alreadyCached ? 'already cached locally' : why,
          source: entry.source, verification: `reviewed ${entry.verifiedOn ?? VERIFIED_ON}`,
        };
      } else {
        report.keptExisting.push({ ...label, url: current, reason: 'working cover not flagged for replacement' });
      }
    } else if (entry?.clearExisting) {
      // Reviewed product with no correct cover available: never leave a
      // mismatched image on it.
      if (current) {
        unset.coverImage = 1;
        action = {
          ...label, from: current, to: null,
          reason: `reviewed cover found wrong and no verified replacement exists (${entry.note ?? 'no exact cover found'}); placeholder shown`,
          source: entry.source, verification: `reviewed ${entry.verifiedOn ?? VERIFIED_ON}`,
        };
      } else {
        report.alreadyCorrect.push({ ...label, url: null, note: 'no cover, placeholder shown' });
      }
      if (!current || !report.withoutVerifiedCover.some((b) => b.id === id)) {
        report.withoutVerifiedCover.push({ ...label, reason: entry.note ?? 'no verified cover' });
      }
    } else if (AUTO && !entry && (!current || definitelyBroken || shared)) {
      try {
        const { candidates } = await findCoverCandidates(book);
        const best = candidates.find((c) => c.match.verdict === 'strong' && c.match.isbnMatch === true && c.match.volumeMatch !== false);
        if (best && (await checkCoverReference(best.coverUrl)).ok) {
          set.coverImage = best.coverUrl;
          action = { ...label, from: current || null, to: best.coverUrl, reason: 'auto-matched by ISBN + title/volume', source: best.source, verification: 'auto-matched, not reviewed by a person' };
        } else {
          report.withoutVerifiedCover.push({ ...label, reason: candidates.length ? 'catalogue results did not confirm ISBN and volume' : 'no catalogue results' });
        }
      } catch (error) {
        report.errors.push({ ...label, message: error.message });
      }
    } else {
      report.withoutVerifiedCover.push({
        ...label,
        reason: entry?.note ?? 'not in data/verifiedCovers.js (run with --auto, or pick a cover in the admin panel)',
      });
    }

    // Never leave a dead/invalid link on a book, even when it has no review entry.
    // Transient network failures are left alone: retrying later is safer than
    // wiping a working cover because a catalogue server was slow once.
    if (!set.coverImage && !unset.coverImage && !entry?.coverUrl && definitelyBroken) {
      unset.coverImage = 1;
      action = { ...label, from: current, to: null, reason: `cleared broken cover (${check.reason}); placeholder shown until a cover is chosen` };
      report.withoutVerifiedCover.push({ ...label, reason: `stored cover was broken (${check.reason})` });
    }

    if (FIX_ISBN && entry?.catalogIsbn && book.isbn && !isValidIsbn(book.isbn)) {
      const taken = isbnUsage.get(normalizeIsbn(entry.catalogIsbn))?.some((b) => String(b._id) !== id);
      if (taken) {
        report.errors.push({ ...label, message: `ISBN ${entry.catalogIsbn} already used by another book; not changed` });
      } else {
        set.isbn = entry.catalogIsbn;
        report.isbnCorrections.push({ ...label, from: book.isbn, to: entry.catalogIsbn, applied: true });
      }
    } else if (entry?.catalogIsbn && book.isbn && !isValidIsbn(book.isbn)) {
      report.isbnCorrections.push({ ...label, from: book.isbn, to: entry.catalogIsbn, applied: false, hint: 're-run with --fix-isbn to apply' });
    }

    if (action) report.updated.push(action);

    if (APPLY && (Object.keys(set).length || Object.keys(unset).length)) {
      const update = {};
      if (Object.keys(set).length) update.$set = set;
      if (Object.keys(unset).length) update.$unset = unset;
      await Book.updateOne({ _id: book._id }, update, { runValidators: true });
    }
  }

  // Summaries and host counts.
  const hosts = new Map();
  for (const ref of coverUsage.keys()) {
    if (!isHttp(ref)) continue;
    const host = hostOf(ref) || 'unknown';
    hosts.set(host, (hosts.get(host) ?? 0) + coverUsage.get(ref));
  }
  report.remoteHosts = [...hosts].map(([host, count]) => ({ host, count })).sort((a, b) => b.count - a.count);
  report.duplicateCovers = [...coverUsage]
    .filter(([, count]) => count > 1)
    .map(([url, count]) => ({ url, count, ...coverChecks.get(url), books: books.filter((b) => b.coverImage === url).map((b) => ({ id: String(b._id), title: b.title })) }));
  report.duplicateIsbns = [...isbnUsage]
    .filter(([, list]) => list.length > 1)
    .map(([isbn, list]) => ({ isbn, books: list.map((b) => ({ id: String(b._id), title: b.title })) }));
  report.summary = {
    total: books.length,
    withCover: books.filter((b) => b.coverImage).length,
    missing: report.missingCovers.length,
    invalidReferences: report.invalidCoverReferences.length,
    broken: report.brokenCoverUrls.length,
    unreachable: report.unreachableCoverUrls.length,
    duplicateCovers: report.duplicateCovers.length,
    duplicateIsbns: report.duplicateIsbns.length,
    hotlinked: report.hotlinkedCovers.length,
    invalidIsbns: report.invalidIsbns.length,
    reviewed: report.matched.length,
    updated: report.updated.length,
  };

  await mkdir(REPORTS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonFile = path.join(REPORTS_DIR, `covers-${report.mode}-${stamp}.json`);
  const mdFile = path.join(REPORTS_DIR, `covers-${report.mode}-${stamp}.md`);
  await writeFile(jsonFile, JSON.stringify(report, null, 2));
  await writeFile(mdFile, renderMarkdown(report));

  const line = (title, list, fmt) => {
    console.log(`${title}: ${list.length}`);
    for (const item of list) console.log(`   - ${fmt(item)}`);
  };
  console.log('Summary:', report.summary);
  line('Missing covers', report.missingCovers, (b) => `${b.title}`);
  line('Invalid cover references', report.invalidCoverReferences, (b) => `${b.title}: ${b.url}`);
  line('Broken cover URLs', report.brokenCoverUrls, (b) => `${b.title}: ${b.reason}`);
  line('Covers not reachable during this run (left unchanged)', report.unreachableCoverUrls, (b) => `${b.title}: ${b.reason}`);
  line('Covers shared by several books', report.duplicateCovers, (d) => `${d.count} books -> ${d.url}`);
  line('Covers hotlinked from sites that do not permit it', report.hotlinkedCovers, (b) => `${b.title} (${b.host})`);
  line('Duplicate ISBNs', report.duplicateIsbns, (d) => `${d.isbn}: ${d.books.map((b) => b.title).join(', ')}`);
  line('ISBNs failing the checksum', report.invalidIsbns, (b) => `${b.title}: ${b.isbn}`);
  line('Matched to reviewed entries', report.matched, (b) => `${b.title} (by ${b.matchedBy})`);
  line(APPLY ? 'Covers updated' : 'Covers that would be updated', report.updated, (b) => `${b.title}: ${b.to ? 'set' : 'cleared'} - ${b.reason}`);
  line('Already correct', report.alreadyCorrect, (b) => b.title + (b.cached ? ' (cached locally)' : ''));
  line('Kept existing cover', report.keptExisting, (b) => `${b.title} - ${b.reason}`);
  line('Books without a verified cover', report.withoutVerifiedCover, (b) => `${b.title} - ${b.reason}`);
  line('ISBN corrections', report.isbnCorrections, (b) => `${b.title}: ${b.from} -> ${b.to}${b.applied === false ? ' (not applied)' : ''}`);
  line('Errors', report.errors, (e) => `${e.title}: ${e.message}`);
  console.log(`\nReports:\n  ${jsonFile}\n  ${mdFile}`);

  await mongoose.disconnect();
};

const renderMarkdown = (report) => {
  const rows = (list, columns) => [
    `| ${columns.map(([label]) => label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...list.map((item) => `| ${columns.map(([, get]) => String(get(item) ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')).join(' | ')} |`),
  ].join('\n');

  return [
    `# Cover ${report.mode === 'fix' ? 'fix' : 'audit'} report`,
    '',
    `Generated: ${report.generatedAt}`,
    `Mode: **${report.mode}** (auto=${report.options.auto}, cache=${report.options.cache}, fixIsbn=${report.options.fixIsbn})`,
    '',
    '## Summary',
    '',
    ...Object.entries(report.summary).map(([key, value]) => `- **${key}**: ${value}`),
    '',
    `## Covers ${report.mode === 'fix' ? 'updated' : 'that would be updated'}`,
    '',
    rows(report.updated, [
      ['Book', (b) => b.title],
      ['From', (b) => b.from ?? '(none)'],
      ['To', (b) => b.to ?? '(cleared)'],
      ['Reason', (b) => b.reason],
    ]),
    '',
    '## Missing covers',
    '',
    rows(report.missingCovers, [['Book', (b) => b.title], ['ISBN', (b) => b.isbn]]),
    '',
    '## Broken or invalid cover references',
    '',
    rows([...report.invalidCoverReferences, ...report.brokenCoverUrls], [
      ['Book', (b) => b.title], ['Reference', (b) => b.url], ['Reason', (b) => b.reason ?? 'invalid reference'],
    ]),
    '',
    '## Covers not reachable during this run',
    '',
    'These checks timed out or got a 429/5xx response. They were left unchanged and should be re-checked.',
    '',
    rows(report.unreachableCoverUrls, [['Book', (b) => b.title], ['Reference', (b) => b.url], ['Reason', (b) => b.reason]]),
    '',
    '## Duplicate covers',
    '',
    rows(report.duplicateCovers, [['Cover', (d) => d.url], ['Books', (d) => d.count], ['Titles', (d) => d.books.map((b) => b.title).join('; ')]]),
    '',
    '## Duplicate ISBNs',
    '',
    rows(report.duplicateIsbns, [['ISBN', (d) => d.isbn], ['Titles', (d) => d.books.map((b) => b.title).join('; ')]]),
    '',
    '## ISBNs failing the checksum',
    '',
    rows(report.invalidIsbns, [['Book', (b) => b.title], ['ISBN', (b) => b.isbn]]),
    '',
    '## Remote cover hosts',
    '',
    rows(report.remoteHosts, [['Host', (h) => h.host], ['Books', (h) => h.count]]),
    '',
    '## Books without a verified cover',
    '',
    rows(report.withoutVerifiedCover, [['Book', (b) => b.title], ['Reason', (b) => b.reason]]),
    '',
    '## Errors',
    '',
    rows(report.errors, [['Book', (e) => e.title], ['Message', (e) => e.message]]),
    '',
  ].join('\n');
};

main().catch(async (error) => {
  console.error('Cover audit failed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
