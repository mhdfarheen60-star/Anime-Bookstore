import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';
import { authenticate, authorize, optionalAuth } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';

const router = Router();

router.get('/', optionalAuth, getAllCategories);
router.get('/:id', getCategoryById);

router.post(
  '/',
  authenticate,
  authorize('admin'),
  [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Description max 500 chars'),
    body('image').optional({ values: 'falsy' }).trim().custom((v) => v === '' || /^https?:\/\/.+/i.test(v)).withMessage('Image must be a valid URL'),
    body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  ],
  validate,
  createCategory
);

router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  [
    param('id').isMongoId().withMessage('Invalid category ID'),
    body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Description max 500 chars'),
    body('image').optional({ values: 'falsy' }).trim().custom((v) => v === '' || /^https?:\/\/.+/i.test(v)).withMessage('Image must be a valid URL'),
    body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  ],
  validate,
  updateCategory
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  [param('id').isMongoId().withMessage('Invalid category ID')],
  validate,
  deleteCategory
);

export default router;