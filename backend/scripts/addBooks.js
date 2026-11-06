// Adds the books in data/additionalBooks.js to an existing database without
// touching anything already there. Safe to run more than once.
//
//   node scripts/addBooks.js           dry run: shows what would be added
//   node scripts/addBooks.js --apply   add the missing books
//
// A book is skipped if its ISBN (however hyphenated) or its title + author is
// already in the database.

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Book from '../models/Book.js';
import Category from '../models/Category.js';
import { additionalBooks } from '../data/additionalBooks.js';
import { isbnQuery } from '../utils/isbn.js';
import escapeRegex from '../utils/escapeRegex.js';

dotenv.config();

const APPLY = process.argv.includes('--apply');

const main = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  console.log(`${APPLY ? 'ADDING BOOKS' : 'DRY RUN (no changes)'} - ${additionalBooks.length} books in data/additionalBooks.js\n`);

  const added = [];
  const skipped = [];
  const failed = [];

  for (const { category: categoryName, ...book } of additionalBooks) {
    const existing = await Book.findOne({
      $or: [
        { isbn: isbnQuery(book.isbn) },
        { title: { $regex: `^${escapeRegex(book.title)}$`, $options: 'i' }, author: book.author },
      ],
    }).select('title isbn');
    if (existing) {
      skipped.push(`${book.title} (already in the catalogue as "${existing.title}")`);
      continue;
    }

    const category = await Category.findOne({ name: categoryName });
    if (!category) {
      failed.push(`${book.title}: category "${categoryName}" not found`);
      continue;
    }

    if (APPLY) {
      try {
        await Book.create({ ...book, category: category._id });
      } catch (error) {
        failed.push(`${book.title}: ${error.message}`);
        continue;
      }
    }
    added.push(`${book.title} [${categoryName}]`);
  }

  const list = (title, items) => {
    console.log(`${title}: ${items.length}`);
    for (const item of items) console.log(`   - ${item}`);
  };
  list(APPLY ? 'Added' : 'Would add', added);
  list('Skipped', skipped);
  list('Failed', failed);
  console.log(`\nBooks in catalogue: ${await Book.countDocuments()}`);

  await mongoose.disconnect();
  if (failed.length) process.exitCode = 1;
};

main().catch(async (error) => {
  console.error('Adding books failed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
