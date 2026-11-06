import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Book from '../models/Book.js';
import Category from '../models/Category.js';

dotenv.config();

await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
const books = await Book.find({}).populate('category', 'name slug').sort({ series: 1, volumeNumber: 1, title: 1 }).lean();
const cats = await Category.find({}).lean();
console.log('BOOKS', books.length, 'CATEGORIES', cats.length);
console.log('COVERLESS', books.filter((b) => !b.coverImage).length);
for (const b of books) {
  console.log(JSON.stringify({
    id: String(b._id),
    title: b.title,
    author: b.author,
    isbn: b.isbn,
    cover: b.coverImage || '',
    series: b.series || '',
    vol: b.volumeNumber ?? null,
    category: b.category?.name ?? '',
    tags: b.tags ?? [],
    active: b.isActive,
  }));
}
await mongoose.disconnect();
