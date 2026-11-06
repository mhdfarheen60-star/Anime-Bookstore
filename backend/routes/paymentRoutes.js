import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { createRazorpayOrder, verifyPayment, createStripeCheckout, handleStripeWebhook } from '../controllers/paymentController.js';

const router = Router();
// Stripe webhooks authenticate via the Stripe signature, not a user session,
// so they must be mounted before the authenticate middleware below.
router.post('/webhook', handleStripeWebhook);
router.use(authenticate);

router.post('/create-order', createRazorpayOrder);
router.post(
  '/verify',
  [
    body('razorpayOrderId').trim().notEmpty(),
    body('razorpayPaymentId').trim().notEmpty(),
    body('razorpaySignature').trim().notEmpty(),
    body('shippingAddress').isObject(),
  ],
  validate,
  verifyPayment
);
router.post('/create-stripe-checkout', createStripeCheckout);

export default router;
