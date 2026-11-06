import mongoose from 'mongoose';
import Book from '../models/Book.js';
import Category from '../models/Category.js';
import { AppError } from '../middleware/errorMiddleware.js';
import escapeRegex from '../utils/escapeRegex.js';
import { isbnQuery } from '../utils/isbn.js';
import { isUploadedCover, deleteCoverFile } from '../utils/coverStorage.js';

// Partial, case-insensitive match on the fields shoppers actually type, so
// "naru" finds Naruto (MongoDB $text only matches whole words).
const textMatch = (term) => {
  const pattern = { $regex: escapeRegex(String(term).trim()), $options: 'i' };
  return { $or: [{ title: pattern }, { author: pattern }, { illustrator: pattern }, { series: pattern }] };
};

const DUPLICATE_ISBN_MESSAGE = 'This ISBN is already assigned to another book.';

// Matches a category by id, slug or name. The storefront filters by category
// name, and a non-ObjectId value in an _id clause makes Mongoose throw.
const categoryLookup = (value) => {
  const or = [{ slug: String(value).toLowerCase() }, { name: { $regex: `^${escapeRegex(value)}$`, $options: 'i' } }];
  if (mongoose.isValidObjectId(value)) or.unshift({ _id: value });
  return { $or: or };
};

// Is another book already using this ISBN (however it's hyphenated)?
const findIsbnOwner = (isbn, excludeId) => {
  const query = isbnQuery(isbn);
  if (!query) return null;
  return Book.findOne({ isbn: query, ...(excludeId && { _id: { $ne: excludeId } }) }).select('title');
};

// Removes an uploaded cover file once no book references it any more, so
// replacing or removing one book's cover never touches another book's image.
const cleanUpCover = async (coverImage) => {
  if (!isUploadedCover(coverImage)) return;
  const stillUsed = await Book.exists({ coverImage });
  if (!stillUsed) await deleteCoverFile(coverImage);
};

const getAllBooks = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      minPrice,
      maxPrice,
      sort = 'createdAt',
      order = 'desc',
      featured,
      includeInactive,
      series,
    } = req.query;

    const query = {}; 

    // Shoppers only ever see live books. An authenticated admin may ask for the
    // full catalogue so they can manage deactivated titles too.
    if (includeInactive === 'true') {
      if (!req.user || req.user.role !== 'admin') {
        return next(new AppError('Admin access required to include inactive books', 403));
      }
    } else {
      query.isActive = true;
    }

    if (search) {
      Object.assign(query, textMatch(search));
    }

    if (series) {
      query.series = String(series);
    }

    if (category) {
      const cat = await Category.findOne({ ...categoryLookup(category), isActive: true });
      if (cat) {
        // A book can sit on extra shelves through its tags (Bestsellers,
        // Preorders, Box Sets, ...) without duplicating the product row.
        query.$and = [
          ...(query.$and ?? []),
          { $or: [{ category: cat._id }, { tags: cat.name }] },
        ];
      } else {
        query._id = null;
      }
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (featured === 'true') {
      query.featured = true;
    }

    const sortOptions = {};
    const allowedSorts = ['price', 'rating', 'createdAt', 'title', 'volumeNumber'];
    const sortField = allowedSorts.includes(sort) ? sort : 'createdAt';
    sortOptions[sortField] = order === 'asc' ? 1 : -1;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [books, total] = await Promise.all([
      Book.find(query)
        .populate('category', 'name slug')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Book.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        books,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalBooks: total,
          hasNext: pageNum < Math.ceil(total / limitNum),
          hasPrev: pageNum > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const getBookById = async (req, res, next) => {
  try {
    const book = await Book.findOne({
      _id: req.params.id,
      isActive: true,
    }).populate('category', 'name slug description image');

    if (!book) {
      return next(new AppError('Book not found', 404));
    }

    // The full run of volumes makes Previous / Current / Next navigation and the
    // "other volumes in this series" shelf possible even for the last volume.
    const seriesBooks = book.series
      ? await Book.find({ series: book.series, isActive: true })
        .populate('category', 'name slug')
        .sort({ volumeNumber: 1, title: 1 })
        .lean()
      : [];
    const otherVolumes = seriesBooks.filter((entry) => String(entry._id) !== String(book._id));
    const volume = book.volumeNumber;
    const previous = volume == null ? null : [...seriesBooks]
      .filter((entry) => entry.volumeNumber != null && entry.volumeNumber < volume)
      .sort((a, b) => b.volumeNumber - a.volumeNumber)[0] ?? null;
    const next = volume == null ? null : seriesBooks
      .find((entry) => entry.volumeNumber != null && entry.volumeNumber > volume) ?? null;

    // Prefer other volumes of the same series, then fill up with the same category.
    const relatedLimit = 8;
    const relatedBooks = otherVolumes.length
      ? otherVolumes.slice(0, relatedLimit)
      : await Book.find({
        _id: { $ne: book._id },
        category: book.category?._id ?? book.category,
        isActive: true,
      })
        .populate('category', 'name slug')
        .limit(relatedLimit)
        .lean();

    res.json({
      success: true,
      data: {
        book,
        relatedBooks,
        seriesBooks: otherVolumes,
        volumeNavigation: { previous, next },
      },
    });
  } catch (error) {
    next(error);
  }
};

const getFeaturedBooks = async (req, res, next) => {
  try {
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 8));
    const books = await Book.find({ featured: true, isActive: true })
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: { books },
    });
  } catch (error) {
    next(error);
  }
};

const searchBooks = async (req, res, next) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({ success: true, data: { books: [] } });
    }

    const max = Math.min(20, Math.max(1, parseInt(limit) || 10));

    // Whole-word matches first (ranked by relevance), then partial matches.
    const ranked = await Book.find(
      { $text: { $search: q }, isActive: true },
      { score: { $meta: 'textScore' } }
    )
      .populate('category', 'name slug')
      .sort({ score: { $meta: 'textScore' } })
      .limit(max)
      .lean();
    const partial = ranked.length < max
      ? await Book.find({ ...textMatch(q), isActive: true, _id: { $nin: ranked.map((b) => b._id) } })
        .populate('category', 'name slug')
        .sort({ series: 1, volumeNumber: 1, title: 1 })
        .limit(max - ranked.length)
        .lean()
      : [];
    const books = [...ranked, ...partial];

    res.json({
      success: true,
      data: { books },
    });
  } catch (error) {
    next(error);
  }
};

// Every series that has at least one live book, with its volumes in order.
// Only real catalogue data: volumes that aren't stocked are not listed.
const getSeries = async (req, res, next) => {
  try {
    const series = await Book.aggregate([
      { $match: { isActive: true, series: { $nin: [null, ''] } } },
      { $sort: { volumeNumber: 1, title: 1 } },
      {
        $group: {
          _id: '$series',
          count: { $sum: 1 },
          author: { $first: '$author' },
          category: { $first: '$category' },
          seriesStatus: { $first: '$seriesStatus' },
          volumes: {
            $push: {
              _id: '$_id', title: '$title', volumeNumber: '$volumeNumber', coverImage: '$coverImage',
              price: '$price', stock: '$stock', colors: '$colors', glyph: '$glyph', author: '$author',
            },
          },
        },
      },
      { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'category' } },
      { $set: { category: { $first: '$category.name' } } },
      { $sort: { count: -1, _id: 1 } },
      { $project: { _id: 0, name: '$_id', count: 1, author: 1, category: 1, volumes: 1 } },
    ]);

    res.json({ success: true, data: { series } });
  } catch (error) {
    next(error);
  }
};

// Every author in the catalogue with how many volumes they have, used by the
// public "Author spotlights" page.
const getAuthors = async (req, res, next) => {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 60));
    const authors = await Book.aggregate([
      { $match: { isActive: true, author: { $nin: [null, ''] } } },
      {
        $group: {
          _id: '$author',
          count: { $sum: 1 },
          series: { $addToSet: '$series' },
          category: { $first: '$category' },
          coverImage: { $first: '$coverImage' },
        },
      },
      { $sort: { count: -1, _id: 1 } },
      { $limit: limit },
      { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'category' } },
      { $set: { category: { $first: '$category.name' } } },
      {
        $project: {
          _id: 0,
          name: '$_id',
          count: 1,
          category: 1,
          coverImage: 1,
          series: { $filter: { input: '$series', as: 's', cond: { $ne: ['$$s', null] } } },
        },
      },
    ]);

    res.json({ success: true, data: { authors } });
  } catch (error) {
    next(error);
  }
};

const createBook = async (req, res, next) => {
  try {
    const {
      title,
      author,
      description,
      price,
      originalPrice,
      coverImage,
      category,
      isbn,
      publisher,
      publishedYear,
      stock,
      language,
      featured,
      colors,
      glyph,
      series,
      volumeNumber,
      illustrator,
      edition,
      pages,
      format,
      publicationDate,
      seriesStatus,
      tags,
    } = req.body;

    if (isbn && (await findIsbnOwner(isbn))) {
      return next(new AppError(DUPLICATE_ISBN_MESSAGE, 409));
    }

    const cat = await Category.findById(category);
    if (!cat) {
      return next(new AppError('Category not found', 404));
    }

    if (!cat.isActive) {
      return next(new AppError('Cannot add book to inactive category', 400));
    }

    const book = await Book.create({
      title,
      author,
      description,
      price,
      originalPrice,
      coverImage,
      category,
      isbn,
      publisher,
      publishedYear,
      stock,
      language,
      featured: featured || false,
      colors: colors || ['#3b2a20', '#8a3b2b'],
      glyph: glyph || '书',
      series: series || undefined,
      volumeNumber: volumeNumber ?? undefined,
      illustrator: illustrator || undefined,
      edition: edition || undefined,
      pages: pages ?? undefined,
      format: format || undefined,
      publicationDate: publicationDate || undefined,
      seriesStatus: seriesStatus || undefined,
      tags: Array.isArray(tags) ? tags : [],
    });

    await book.populate('category', 'name slug');

    res.status(201).json({
      success: true,
      message: 'Book created successfully',
      data: { book },
    });
  } catch (error) {
    if (error.code === 11000 && error.keyValue?.isbn) {
      return next(new AppError(DUPLICATE_ISBN_MESSAGE, 409));
    }
    next(error);
  }
};

const updateBook = async (req, res, next) => {
  try {
    const {
      title,
      author,
      description,
      price,
      originalPrice,
      coverImage,
      category,
      isbn,
      publisher,
      publishedYear,
      stock,
      language,
      featured,
      isActive,
      colors,
      glyph,
      series,
      volumeNumber,
      illustrator,
      edition,
      pages,
      format,
      publicationDate,
      seriesStatus,
      tags,
    } = req.body;

    const bookId = req.params.id;

    // First, get the current book to check its existing ISBN
    const currentBook = await Book.findById(bookId);
    if (!currentBook) {
      return next(new AppError('Book not found', 404));
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (author !== undefined) updateData.author = author;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (originalPrice !== undefined) updateData.originalPrice = originalPrice;
    if (coverImage !== undefined) updateData.coverImage = coverImage;
    if (category !== undefined) updateData.category = category;
    if (isbn !== undefined) updateData.isbn = isbn;
    if (publisher !== undefined) updateData.publisher = publisher;
    if (publishedYear !== undefined) updateData.publishedYear = publishedYear;
    if (stock !== undefined) updateData.stock = stock;
    if (language !== undefined) updateData.language = language;
    if (featured !== undefined) updateData.featured = featured;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (colors !== undefined) updateData.colors = colors;
    if (glyph !== undefined) updateData.glyph = glyph;
    if (series !== undefined) updateData.series = series;
    if (volumeNumber !== undefined) updateData.volumeNumber = volumeNumber;
    if (illustrator !== undefined) updateData.illustrator = illustrator;
    if (edition !== undefined) updateData.edition = edition;
    if (pages !== undefined) updateData.pages = pages;
    if (format !== undefined) updateData.format = format;
    if (publicationDate !== undefined) updateData.publicationDate = publicationDate;
    if (seriesStatus !== undefined) updateData.seriesStatus = seriesStatus;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];

    // Empty values clear the field instead of storing ''/null.
    const unset = {};
    for (const field of ['coverImage', 'series', 'volumeNumber', 'isbn', 'originalPrice', 'illustrator', 'edition', 'pages', 'format', 'publicationDate', 'seriesStatus']) {
      if (updateData[field] === '' || updateData[field] === null) {
        delete updateData[field];
        unset[field] = 1;
      }
    }

    if (category) {
      const cat = await Category.findById(category);
      if (!cat) {
        return next(new AppError('Category not found', 404));
      }
      if (!cat.isActive) {
        return next(new AppError('Cannot assign book to inactive category', 400));
      }
    }

    // Check for ISBN duplicate if ISBN is being updated and it's different from current
    if (isbn && isbn !== currentBook.isbn && (await findIsbnOwner(isbn, bookId))) {
      return next(new AppError(DUPLICATE_ISBN_MESSAGE, 409));
    }

    const update = Object.keys(unset).length ? { $set: updateData, $unset: unset } : updateData;
    const book = await Book.findByIdAndUpdate(bookId, update, {
      new: true,
      runValidators: true,
    }).populate('category', 'name slug');

    if (currentBook.coverImage && currentBook.coverImage !== book.coverImage) {
      await cleanUpCover(currentBook.coverImage);
    }

    res.json({
      success: true,
      message: 'Book updated successfully',
      data: { book },
    });
  } catch (error) {
    // Handle MongoDB duplicate key error (E11000) for ISBN
    if (error.code === 11000 && error.keyValue && error.keyValue.isbn) {
      return next(new AppError(DUPLICATE_ISBN_MESSAGE, 409));
    }
    next(error);
  }
};

const deleteBook = async (req, res, next) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);

    if (!book) {
      return next(new AppError('Book not found', 404));
    }

    await cleanUpCover(book.coverImage);

    res.json({
      success: true,
      message: 'Book deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

const updateBookStock = async (req, res, next) => {
  try {
    const { stock, operation } = req.body;

    if (typeof stock !== 'number' || stock < 0) {
      return next(new AppError('Valid stock number is required', 400));
    }

    const book = await Book.findById(req.params.id);
    if (!book) {
      return next(new AppError('Book not found', 404));
    }

    let newStock;
    if (operation === 'increment') {
      newStock = book.stock + stock;
    } else if (operation === 'decrement') {
      newStock = Math.max(0, book.stock - stock);
    } else {
      newStock = stock;
    }

    book.stock = newStock;
    await book.save();

    res.json({
      success: true,
      message: 'Stock updated successfully',
      data: { stock: book.stock },
    });
  } catch (error) {
    next(error);
  }
};

const getBooksByCategory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, sort = 'createdAt', order = 'desc' } = req.query;

    const category = await Category.findOne({ ...categoryLookup(req.params.id), isActive: true });

    if (!category) {
      return next(new AppError('Category not found', 404));
    }

    const sortOptions = {};
    const allowedSorts = ['price', 'rating', 'createdAt', 'title', 'volumeNumber'];
    const sortField = allowedSorts.includes(sort) ? sort : 'createdAt';
    sortOptions[sortField] = order === 'asc' ? 1 : -1;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const match = { $or: [{ category: category._id }, { tags: category.name }], isActive: true };

    const [books, total] = await Promise.all([
      Book.find(match)
        .populate('category', 'name slug')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Book.countDocuments(match),
    ]);

    res.json({
      success: true,
      data: {
        category: {
          id: category._id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          image: category.image,
        },
        books,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalBooks: total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export {
  getAllBooks,
  getBookById,
  getFeaturedBooks,
  getAuthors,
  searchBooks,
  getSeries,
  createBook,
  updateBook,
  deleteBook,
  updateBookStock,
  getBooksByCategory,
};