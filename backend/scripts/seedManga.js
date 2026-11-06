// Adds the anime / manga / light-novel catalogue to an existing database.
//
//   node scripts/seedManga.js            apply the catalogue
//   node scripts/seedManga.js --dry-run  show what would change, write nothing
//
// Idempotent and non-destructive:
//   - Categories are created only when missing.
//   - A catalogue product is matched by ISBN first, then series + volume, then
//     exact title, so running the script again never creates a second copy.
//   - Existing price, stock, cover, featured flag and ISBN are kept. Only empty
//     metadata fields are filled in. New products get the catalogue values.
//   - ISBNs are globally unique: an entry whose ISBN is already used by a
//     different book is inserted without that ISBN instead of failing.
//   - Nothing is ever deleted.

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Book from '../models/Book.js';
import Category from '../models/Category.js';
import { mangaCategories, mangaSeries } from '../data/mangaSeries.js';
import { mangaCatalog } from '../data/mangaCatalog.js';
import { isbnQuery } from '../utils/isbn.js';
import escapeRegex from '../utils/escapeRegex.js';

dotenv.config();

const DRY_RUN = process.argv.includes('--dry-run');

// The generated catalogue stores the tags it was built with; the curated file is
// the source of truth for special products, so a tag edit does not require a
// network rebuild.
const specialTags = new Map(
  mangaSeries.filter((entry) => entry.kind === 'special').map((entry) => [entry.title, entry.tags ?? []])
);

const slugify = (value) => String(value)
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

// "Berserk Deluxe Volume 1" and "Berserk Deluxe, Vol. 1" are the same product.
const titleKey = (value) => String(value ?? '')
  .toLowerCase()
  .split(/[^a-z0-9]+/)
  .filter(Boolean)
  .filter((word) => word !== 'vol' && word !== 'volume')
  .join(' ');

const log = (...args) => console.log(...args);

const ensureCategories = async () => {
  const map = new Map();
  let created = 0;

  for (const definition of mangaCategories) {
    let category = await Category.findOne({
      name: { $regex: `^${escapeRegex(definition.name)}$`, $options: 'i' },
    });
    if (!category) {
      category = await Category.findOne({ slug: slugify(definition.name) });
    }
    if (!category) {
      const slug = slugify(definition.name);
      if (DRY_RUN) {
        category = { _id: `dry-${slug}`, name: definition.name, slug };
      } else {
        category = await Category.create({
          name: definition.name,
          slug,
          description: definition.description,
          isActive: true,
        });
      }
      created += 1;
      log(`  + category ${definition.name}`);
    }
    map.set(definition.name, category);
  }

  return { map, created };
};

const fill = (target, source) => {
  const patch = {};
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || value === null || value === '') continue;
    const current = target[key];
    const empty = current === undefined || current === null || current === ''
      || (Array.isArray(current) && current.length === 0);
    if (empty) patch[key] = value;
  }
  return patch;
};

const findExisting = async (entry) => {
  if (entry.isbn) {
    const byIsbn = await Book.findOne({ isbn: isbnQuery(entry.isbn) });
    if (byIsbn) return { book: byIsbn, matchedBy: 'ISBN' };
  }

  if (entry.series && entry.volumeNumber != null) {
    const byVolume = await Book.findOne({
      series: { $regex: `^${escapeRegex(entry.series)}$`, $options: 'i' },
      volumeNumber: entry.volumeNumber,
    });
    if (byVolume) return { book: byVolume, matchedBy: 'series + volume' };
  }

  const byTitle = await Book.findOne({
    title: { $regex: `^${escapeRegex(entry.title)}$`, $options: 'i' },
  });
  if (byTitle) return { book: byTitle, matchedBy: 'title' };

  // Specials have no series/volume, and their catalogue title may differ only in
  // punctuation ("Berserk Deluxe Volume 1" vs "Berserk Deluxe, Vol. 1").
  if (!entry.series) {
    const key = titleKey(entry.title);
    const firstWord = key.split(' ')[0];
    if (firstWord) {
      const candidates = await Book.find({
        title: { $regex: escapeRegex(firstWord), $options: 'i' },
      });
      const byKey = candidates.find((book) => titleKey(book.title) === key);
      if (byKey) return { book: byKey, matchedBy: 'normalized title' };
    }
  }

  return null;
};

const metadataFrom = (entry, categoryId) => ({
  title: entry.title,
  author: entry.author,
  description: entry.description,
  price: entry.price,
  coverImage: entry.coverImage,
  category: categoryId,
  publisher: entry.publisher,
  publishedYear: entry.publishedYear,
  stock: entry.stock,
  language: entry.language,
  colors: entry.colors,
  glyph: entry.glyph,
  series: entry.series,
  volumeNumber: entry.volumeNumber,
  isbn: entry.isbn,
  illustrator: entry.illustrator,
  edition: entry.edition,
  pages: entry.pages,
  format: entry.format,
  publicationDate: entry.publicationDate ? new Date(entry.publicationDate) : undefined,
  seriesStatus: entry.seriesStatus,
  tags: entry.tags ?? [],
  featured: Boolean(entry.featured),
  isActive: true,
});

const main = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });

  log(`${DRY_RUN ? 'DRY RUN (no changes)' : 'SEEDING MANGA CATALOGUE'} — ${mangaCatalog.length} products`);

  const { map: categories, created: categoriesCreated } = await ensureCategories();
  log(`Categories: ${categoriesCreated} created, ${categories.size - categoriesCreated} already present`);

  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  const skipped = [];

  for (const entry of mangaCatalog) {
    const category = categories.get(entry.category);
    if (!category) {
      skipped.push(`${entry.title} (unknown category "${entry.category}")`);
      continue;
    }

    const metadata = metadataFrom(entry, category._id);
    const tags = specialTags.get(entry.title) ?? entry.tags ?? [];
    metadata.tags = tags;

    const match = await findExisting(entry);
    const existing = match?.book;

    if (!existing) {
      // Never insert a duplicate ISBN. If another record owns it, insert this
      // product without an ISBN so the unique index stays valid.
      if (entry.isbn) {
        const isbnTaken = await Book.findOne({ isbn: isbnQuery(entry.isbn) });
        if (isbnTaken) delete metadata.isbn;
      }

      if (DRY_RUN) {
        log(`  + ${entry.title} (${entry.category})`);
      } else {
        const book = new Book(metadata);
        await book.save();
      }
      inserted += 1;
      continue;
    }

    // Existing records keep their commercial data and identity. Only missing
    // descriptive fields are filled in.
    const { title, author, description, price, stock, isbn, category: _ignored, featured, ...editable } = metadata;
    const existingTags = existing.tags ?? [];
    const mergedTags = [...new Set([...existingTags, ...(tags ?? [])])];
    const addedTags = mergedTags.filter((tag) => !existingTags.includes(tag));
    const patch = fill(existing, {
      ...editable,
      series: entry.series,
      volumeNumber: entry.volumeNumber,
      // A reviewed/real cover already on the record is never replaced.
      coverImage: entry.coverImage,
      seriesStatus: entry.seriesStatus,
    });

    // Tags are merged below with $addToSet; setting them here as well would make
    // MongoDB reject the update for touching the same path twice.
    delete patch.tags;

    // A matched catalogue product belongs on its catalogue shelf. Products that
    // were previously filed under a genre move to Manga / Light Novels once,
    // then stay there on later runs.
    if (existing.category && String(existing.category) !== String(category._id)) {
      patch.category = category._id;
    }

    if (Object.keys(patch).length || addedTags.length) {
      if (DRY_RUN) {
        const changed = [...Object.keys(patch), ...(addedTags.length ? [`tags+${addedTags.length}`] : [])];
        log(`  ~ ${existing.title} [${match.matchedBy}] ${changed.join(', ')}`);
      } else {
        const update = {};
        if (Object.keys(patch).length) update.$set = patch;
        if (addedTags.length) update.$addToSet = { tags: { $each: addedTags } };
        await Book.updateOne({ _id: existing._id }, update);
      }
      updated += 1;
    } else {
      unchanged += 1;
    }
  }

  const total = await Book.countDocuments();
  const series = new Set(mangaSeries.filter((entry) => entry.kind !== 'special').map((entry) => entry.name));

  log('');
  log(`${DRY_RUN ? 'Would insert' : 'Inserted'}: ${inserted}`);
  log(`Updated: ${updated}`);
  log(`Unchanged: ${unchanged}`);
  if (skipped.length) {
    log(`Skipped: ${skipped.length}`);
    for (const line of skipped.slice(0, 20)) log(`  - ${line}`);
  }
  log(`Catalogue: ${series.size} series, ${mangaCatalog.length - mangaSeries.filter((e) => e.kind === 'special').length} volumes, ${mangaSeries.filter((e) => e.kind === 'special').length} artbooks / box sets / collector editions`);
  log(`Books now in database: ${total}`);

  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error('Manga seed failed:', error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
