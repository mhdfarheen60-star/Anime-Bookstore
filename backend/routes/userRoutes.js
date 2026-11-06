import { Router } from 'express';
import { param, body } from 'express-validator';
import { getAllUsers, getUserById, updateUser, getUserOrders, deleteUser, getUserStats } from '../controllers/userController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/stats', getUserStats);
router.get('/', getAllUsers);
router.get('/:id', [param('id').isMongoId().withMessage('Invalid user ID')], validate, getUserById);
router.get('/:id/orders', [param('id').isMongoId().withMessage('Invalid user ID')], validate, getUserOrders);

router.put(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
    body('phone').optional().trim().isMobilePhone('any').withMessage('Valid phone required'),
    body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
    body('role').optional().isIn(['customer', 'admin']).withMessage('Role must be customer or admin'),
  ],
  validate,
  updateUser
);

router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid user ID')],
  validate,
  deleteUser
);

export default router;