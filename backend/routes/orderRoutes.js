import { Router } from 'express';
import { body, param } from 'express-validator';
import { createOrder, getMyOrders, getOrderById, cancelOrder } from '../controllers/orderController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  [
    body('shippingAddress').isObject().withMessage('Shipping address is required'),
    body('shippingAddress.name').trim().notEmpty().withMessage('Name is required'),
    body('shippingAddress.phone').trim().notEmpty().withMessage('Phone is required'),
    body('shippingAddress.street').trim().notEmpty().withMessage('Street is required'),
    body('shippingAddress.city').trim().notEmpty().withMessage('City is required'),
    body('shippingAddress.state').trim().notEmpty().withMessage('State is required'),
    body('shippingAddress.zipCode').trim().notEmpty().withMessage('ZIP code is required'),
    body('shippingAddress.country').trim().notEmpty().withMessage('Country is required'),
    body('paymentMethod').optional().isIn(['cod', 'card', 'bank_transfer', 'wallet', 'razorpay', 'stripe']).withMessage('Invalid payment method'),
    body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes max 1000 chars'),
  ],
  validate,
  createOrder
);

router.get('/my-orders', getMyOrders);
router.get('/:id', [param('id').isMongoId().withMessage('Invalid order ID')], validate, getOrderById);
router.patch('/:id/cancel', [param('id').isMongoId().withMessage('Invalid order ID')], validate, cancelOrder);

export default router;