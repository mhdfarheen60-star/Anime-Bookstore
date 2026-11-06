import express, { Router } from 'express';
import { body } from 'express-validator';
import { register, login, googleLogin, logout, getMe, updateProfile, uploadAvatar, changePassword } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { MAX_AVATAR_BYTES } from '../utils/avatarStorage.js';

const router = Router();

router.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
      .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
      .matches(/\d/).withMessage('Password must contain a number'),
    body('username')
      .optional()
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be 3-30 characters')
      .matches(/^[a-z0-9_]+$/)
      .withMessage('Username can only contain lowercase letters, numbers, and underscores'),
    body('bio')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Bio cannot exceed 500 characters'),
  ],
  validate,
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  login
);

router.post(
  '/google',
  [body('credential').isString().notEmpty().withMessage('Google credential is required')],
  validate,
  googleLogin
);

router.post('/logout', logout);

router.get('/me', authenticate, getMe);

router.put(
  '/profile',
  authenticate,
  [
    body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
    // Empty phone, username or avatar means "not set", so their format checks
    // only apply to non-empty values.
    body('phone').optional({ values: 'falsy' }).trim().isMobilePhone('any').withMessage('Please provide a valid phone number'),
    body('username')
      .optional({ values: 'falsy' })
      .trim()
      .toLowerCase()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be 3-30 characters')
      .matches(/^[a-z0-9_]+$/)
      .withMessage('Username can only contain lowercase letters, numbers, and underscores'),
    body('bio').optional().trim().isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters'),
    body('avatar')
      .optional({ values: 'falsy' })
      .trim()
      .custom((v) => /^https?:\/\/\S+$/i.test(v) || /^\/uploads\/avatars\/[\w.-]+$/.test(v))
      .withMessage('Profile picture must be an http(s) URL or an uploaded image'),
  ],
  validate,
  updateProfile
);

router.post(
  '/avatar',
  authenticate,
  express.raw({ type: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], limit: MAX_AVATAR_BYTES }),
  uploadAvatar
);

router.put(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('New password must contain an uppercase letter')
      .matches(/[a-z]/).withMessage('New password must contain a lowercase letter')
      .matches(/\d/).withMessage('New password must contain a number'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  ],
  validate,
  changePassword
);

export default router;