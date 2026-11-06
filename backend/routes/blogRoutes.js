import express, { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getPosts,
  getFeaturedPost,
  getCategories,
  getPostBySlug,
  getRelatedPosts,
  getAllPosts,
  createPost,
  updatePost,
  deletePost,
} from '../controllers/blogController.js';
import { uploadBlogImage } from '../controllers/blogImageController.js';
import { MAX_BLOG_IMAGE_BYTES } from '../utils/blogImageStorage.js';
import { authenticate, authorize, optionalAuth } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';

const router = Router();

const postRules = [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required (max 200 chars)'),
  body('slug').optional({ values: 'falsy' }).trim().isLength({ max: 220 }).withMessage('Slug max 220 chars'),
  body('excerpt').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Excerpt max 500 chars'),
  body('content').trim().isLength({ min: 1, max: 60000 }).withMessage('Content is required'),
  body('coverImage')
    .optional({ values: 'falsy' })
    .trim()
    .custom((v) => /^https?:\/\/\S+$/i.test(v) || /^\/uploads\/blog\/[\w.-]+$/.test(v))
    .withMessage('Cover image must be an http(s) URL or an uploaded image'),
  body('category').optional({ values: 'falsy' }).trim().isLength({ max: 60 }).withMessage('Category max 60 chars'),
  body('author').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('Author max 100 chars'),
  body('status').optional().isIn(['draft', 'published']).withMessage('Status must be draft or published'),
  body('featured').optional().isBoolean().withMessage('Featured must be boolean'),
];

// Admin routes
router.get('/admin/posts', authenticate, authorize('admin'), getAllPosts);

// Public routes
router.get('/', optionalAuth, getPosts);
router.get('/featured', getFeaturedPost);
router.get('/categories', getCategories);
router.get('/:slug/related', getRelatedPosts);
router.get('/:slug', getPostBySlug);

router.post(
  '/',
  authenticate,
  authorize('admin'),
  postRules,
  validate,
  createPost
);

router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  [
    param('id').isMongoId().withMessage('Invalid post ID'),
    body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Title max 200 chars'),
    body('slug').optional({ values: 'falsy' }).trim().isLength({ max: 220 }).withMessage('Slug max 220 chars'),
    body('excerpt').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Excerpt max 500 chars'),
    body('content').optional().trim().isLength({ min: 1, max: 60000 }).withMessage('Content max 60000 chars'),
    body('coverImage')
      .optional({ values: 'falsy' })
      .trim()
      .custom((v) => /^https?:\/\/\S+$/i.test(v) || /^\/uploads\/blog\/[\w.-]+$/.test(v))
      .withMessage('Cover image must be an http(s) URL or an uploaded image'),
    body('category').optional({ values: 'falsy' }).trim().isLength({ max: 60 }).withMessage('Category max 60 chars'),
    body('author').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('Author max 100 chars'),
    body('status').optional().isIn(['draft', 'published']).withMessage('Status must be draft or published'),
    body('featured').optional().isBoolean().withMessage('Featured must be boolean'),
  ],
  validate,
  updatePost
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  [param('id').isMongoId().withMessage('Invalid post ID')],
  validate,
  deletePost
);

// Admin image upload. Registered after the public reads so "images" is never
// mistaken for a slug.
router.post(
  '/images/upload',
  authenticate,
  authorize('admin'),
  express.raw({ type: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], limit: MAX_BLOG_IMAGE_BYTES }),
  uploadBlogImage
);

export default router;
