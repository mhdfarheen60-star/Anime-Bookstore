import express, { Router } from 'express';
import { body, param } from 'express-validator';
import {
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
} from '../controllers/bookController.js';
import { searchCovers, uploadCover } from '../controllers/coverController.js';
import { MAX_COVER_BYTES } from '../utils/coverStorage.js';
import { authenticate, authorize, optionalAuth } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';

const router = Router();

// Fields shared by create and update. Empty strings are allowed so an admin can
// clear a value (the controller turns them into $unset).
const coverImageRule = body('coverImage')
  .optional({ values: 'falsy' })
  .trim()
  .custom((v) => /^https?:\/\/\S+$/i.test(v) || /^\/uploads\/covers\/[\w.-]+$/.test(v))
  .withMessage('Cover image must be an http(s) URL or an uploaded cover');
const seriesRule = body('series').optional({ values: 'falsy' }).trim().isLength({ max: 150 }).withMessage('Series max 150 chars');
const volumeRule = body('volumeNumber').optional({ values: 'null' }).custom((v) => v === '' || (Number.isInteger(Number(v)) && Number(v) >= 0)).withMessage('Volume must be a whole number');

// Manga / collector metadata shared by create and update.
const metadataRules = [
  body('illustrator').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('Illustrator max 100 chars'),
  body('edition').optional({ values: 'falsy' }).trim().isLength({ max: 120 }).withMessage('Edition max 120 chars'),
  body('pages').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Pages must be a positive whole number'),
  body('format').optional({ values: 'falsy' }).trim().isLength({ max: 60 }).withMessage('Format max 60 chars'),
  body('publicationDate').optional({ values: 'falsy' }).isISO8601().withMessage('Publication date must be a valid date'),
  body('seriesStatus').optional({ values: 'falsy' }).isIn(['Ongoing', 'Completed', 'Upcoming']).withMessage('Invalid series status'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('tags.*').optional().trim().isLength({ max: 50 }).withMessage('Each tag must be 50 characters or fewer'),
];

// Public routes
// optionalAuth lets the controller know whether the caller is an admin, which is
// what gates the includeInactive flag below. Unauthenticated visitors are fine.
router.get('/', optionalAuth, getAllBooks);
router.get('/featured', getFeaturedBooks);
router.get('/authors', getAuthors);
router.get('/search', searchBooks);
router.get('/series', getSeries);
router.get('/category/:id', getBooksByCategory);

// Admin cover tools. Registered before '/:id' so "covers" isn't read as a book id.
router.get('/covers/search', authenticate, authorize('admin'), searchCovers);
router.post(
  '/covers/upload',
  authenticate,
  authorize('admin'),
  express.raw({ type: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], limit: MAX_COVER_BYTES }),
  uploadCover
);

router.get('/:id', getBookById);

// Admin routes
router.post(
  '/',
  authenticate,
  authorize('admin'),
  [
    body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required (max 200 chars)'),
    body('author').trim().isLength({ min: 1, max: 100 }).withMessage('Author is required (max 100 chars)'),
    body('description').trim().isLength({ min: 10, max: 5000 }).withMessage('Description is required (10-5000 chars)'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('originalPrice').optional().isFloat({ min: 0 }).withMessage('Original price must be a positive number'),
    body('category').isMongoId().withMessage('Valid category ID is required'),
    body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
    body('isbn').optional({ values: 'falsy' }).isISBN().withMessage('Please provide a valid ISBN (check the digits)'),
    body('publisher').optional().trim().isLength({ max: 100 }).withMessage('Publisher max 100 chars'),
    body('publishedYear').optional().isInt({ min: 1000, max: new Date().getFullYear() + 1 }).withMessage('Invalid year'),
    body('language').optional().trim().isLength({ max: 50 }).withMessage('Language max 50 chars'),
    body('featured').optional().isBoolean().withMessage('Featured must be boolean'),
    coverImageRule,
    seriesRule,
    volumeRule,
    ...metadataRules,
  ],
  validate,
  createBook
);

router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  [
    param('id').isMongoId().withMessage('Invalid book ID'),
    body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Title max 200 chars'),
    body('author').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Author max 100 chars'),
    body('description').optional().trim().isLength({ min: 10, max: 5000 }).withMessage('Description 10-5000 chars'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be positive'),
    body('originalPrice').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Original price must be positive'),
    body('category').optional().isMongoId().withMessage('Valid category ID required'),
    body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be non-negative integer'),
    body('isbn').optional({ values: 'falsy' }).isISBN().withMessage('Please provide a valid ISBN (check the digits)'),
    body('featured').optional().isBoolean().withMessage('Featured must be boolean'),
    body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
    coverImageRule,
    seriesRule,
    volumeRule,
    ...metadataRules,
  ],
  validate,
  updateBook
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  [param('id').isMongoId().withMessage('Invalid book ID')],
  validate,
  deleteBook
);

router.patch(
  '/:id/stock',
  authenticate,
  authorize('admin'),
  [
    param('id').isMongoId().withMessage('Invalid book ID'),
    body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
    body('operation').optional().isIn(['set', 'increment', 'decrement']).withMessage('Invalid operation'),
  ],
  validate,
  updateBookStock
);

export default router;