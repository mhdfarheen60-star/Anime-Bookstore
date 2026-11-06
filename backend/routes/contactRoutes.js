import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  createMessage,
  listMessages,
  unreadCount,
  markMessageRead,
  deleteMessage,
} from '../controllers/contactController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { contactLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Public contact form submission.
router.post(
  '/contact',
  contactLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('message')
      .trim()
      .isLength({ min: 10, max: 5000 })
      .withMessage('Message must be 10-5000 characters'),
  ],
  validate,
  createMessage
);

// Admin inbox.
router.get('/admin/contact-messages', authenticate, authorize('admin'), listMessages);
router.get('/admin/contact-messages/unread-count', authenticate, authorize('admin'), unreadCount);
router.patch(
  '/admin/contact-messages/:id/read',
  authenticate,
  authorize('admin'),
  [
    param('id').isMongoId().withMessage('Invalid message ID'),
    body('isRead').optional().isBoolean().withMessage('isRead must be boolean'),
  ],
  validate,
  markMessageRead
);
router.delete(
  '/admin/contact-messages/:id',
  authenticate,
  authorize('admin'),
  [param('id').isMongoId().withMessage('Invalid message ID')],
  validate,
  deleteMessage
);

export default router;
