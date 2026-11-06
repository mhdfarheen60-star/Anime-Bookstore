import { Router } from 'express';
import { param, body } from 'express-validator';
import { getAllOrders, getOrderById, updateOrderStatus, getOrderStats } from '../controllers/adminOrderController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/stats', getOrderStats);
router.get('/', getAllOrders);
router.get('/:id', [param('id').isMongoId().withMessage('Invalid order ID')], validate, getOrderById);

router.patch(
  '/:id/status',
  [
    param('id').isMongoId().withMessage('Invalid order ID'),
    body('status').optional().isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status'),
    body('paymentStatus').optional().isIn(['pending', 'paid', 'failed', 'refunded']).withMessage('Invalid payment status'),
  ],
  validate,
  updateOrderStatus
);

export default router;