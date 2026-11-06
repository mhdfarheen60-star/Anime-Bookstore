import Razorpay from 'razorpay';
import Stripe from 'stripe';
import crypto from 'crypto';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Book from '../models/Book.js';
import { AppError } from '../middleware/errorMiddleware.js';

const getKeyId = () => process.env.RAZORPAY_KEY_ID;
const getKeySecret = () => process.env.RAZORPAY_KEY_SECRET;
const getCheckoutConfigId = () => process.env.RAZORPAY_CHECKOUT_CONFIG_ID;

const getRazorpay = () => {
  const key_id = getKeyId();
  const key_secret = getKeySecret();
  if (!key_id || !key_secret) {
    // Log the variable names only, never their values.
    const missing = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'].filter((name) => !process.env[name]);
    console.error(`Razorpay disabled: missing ${missing.join(', ')} in backend/.env`);
    throw new AppError('Online payment is unavailable right now. Please choose Cash on Delivery.', 503);
  }
  return new Razorpay({ key_id, key_secret });
};

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    const missing = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'].filter((name) => !process.env[name]);
    console.error(`Stripe disabled: missing ${missing.join(', ')} in backend/.env`);
    throw new AppError('Online payment is unavailable right now. Please choose Cash on Delivery.', 503);
  }
  // Key secret stays backend-only; the webhook secret is verified server-side.
  return new Stripe(key);
};

// Razorpay puts the reason in error.error.description; a 401 means our keys are wrong.
const toRazorpayError = (error) => {
  if (error.statusCode === 401) {
    return new AppError('Razorpay rejected the API keys. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.', 502);
  }
  return new AppError(error.error?.description || 'Razorpay request failed. Please try again.', 502);
};

// Compute the payable amount from the trusted cart, never from the client.
const computeCartTotals = async (userId) => {
  const cart = await Cart.findOne({ user: userId }).populate({
    path: 'items.book',
    select: 'title author coverImage price stock isActive',
  });
  if (!cart || cart.items.length === 0) {
    throw new AppError('Cart is empty', 400);
  }
  const validItems = cart.items.filter((i) => i.book && i.book.isActive && i.book.stock > 0);
  if (validItems.length === 0) throw new AppError('No valid items in cart', 400);
  for (const item of validItems) {
    if (item.quantity > item.book.stock) {
      throw new AppError(`Insufficient stock for "${item.book.title}"`, 400);
    }
  }
  const subtotal = validItems.reduce((s, i) => s + i.priceAtAdd * i.quantity, 0);
  const shippingFee = subtotal > 500 ? 0 : 50;
  const tax = Math.round(subtotal * 0.1);
  const total = subtotal + shippingFee + tax;
  return { cart, validItems, subtotal, shippingFee, tax, total };
};

// Create a Razorpay order without touching the cart or stock. The order is
// only created and stock decremented after payment verification succeeds.
const createRazorpayOrder = async (req, res, next) => {
  try {
    const razorpay = getRazorpay();
    const { subtotal, shippingFee, tax, total } = await computeCartTotals(req.user._id);

    const currency = 'USD';
    const amount = Math.round(total * 100); // minor units

    let rpOrder;
    try {
      const orderRequest = {
        amount,
        currency,
        receipt: `rcpt_${Date.now()}`,
        notes: { userId: String(req.user._id) },
      };
      // Use the saved Razorpay Checkout Configuration (payment methods, flows).
      const checkoutConfigId = getCheckoutConfigId();
      if (checkoutConfigId) {
        orderRequest.checkout_config_id = checkoutConfigId;
      }
      rpOrder = await razorpay.orders.create(orderRequest);
    } catch (error) {
      return next(toRazorpayError(error));
    }

    res.json({
      success: true,
      data: {
        keyId: getKeyId(),
        razorpayOrderId: rpOrder.id,
        amount: rpOrder.amount,
        currency: rpOrder.currency,
        subtotal,
        shippingFee,
        tax,
        total,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Create a Stripe Checkout Session for the current cart. Totals are computed
// server-side from the trusted cart (never from client input), an Order is
// created first (pending) so the session can carry its ID as payment metadata.
const createStripeCheckout = async (req, res, next) => {
  try {
    const stripe = getStripe();
    const { subtotal, shippingFee, tax, total, validItems } = await computeCartTotals(req.user._id);

    const requiredFields = ['name', 'phone', 'street', 'city', 'state', 'zipCode', 'country'];
    for (const field of requiredFields) {
      if (!req.body.shippingAddress?.[field]) {
        return next(new AppError(`${field} is required in shipping address`, 400));
      }
    }

    const orderItems = validItems.map((item) => ({
      book: item.book._id,
      title: item.book.title,
      author: item.book.author,
      coverImage: item.book.coverImage,
      price: item.priceAtAdd,
      quantity: item.quantity,
    }));

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress: req.body.shippingAddress,
      subtotal,
      shippingFee,
      tax,
      total,
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'stripe',
    });

    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) {
      return next(new AppError('FRONTEND_URL is not configured. Set it to your deployed frontend URL.', 503));
    }
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'USD',
            unit_amount: Math.round(total * 100), // Stripe expects minor units (cents)
            product_data: { name: `Book Store Order ${order.orderNumber}` },
          },
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/profile?tab=history&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/cart?session_id={CHECKOUT_SESSION_ID}&cancelled=1`,
      metadata: {
        orderId: String(order._id),
        userId: String(req.user._id),
      },
    });

    res.json({
      success: true,
      data: {
        checkoutUrl: session.url,
        sessionId: session.id,
        orderId: String(order._id),
        amount: session.amount_total,
        currency: session.currency,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Stripe webhook: verifies the signature, then marks the order paid only when
// the checkout session confirms a successful payment. Idempotent per order.
const handleStripeWebhook = async (req, res, next) => {
  try {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return next(new AppError('Stripe webhook is not configured', 503));
    }

    const event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = await stripe.checkout.sessions.retrieve(event.data.object.id);
      const orderId = session.metadata?.orderId;
      if (session.payment_status === 'paid' && orderId) {
        const order = await Order.findById(orderId);
        // Idempotency: never process the same order twice.
        if (order && order.paymentStatus !== 'paid') {
          // Never trust unverified amounts; only a verified session can settle.
          if (Number(session.amount_total) !== Math.round(order.total * 100)) {
            return res.status(200).json({ received: true });
          }
          order.paymentStatus = 'paid';
          order.stripePaymentId = session.payment_intent?.id || session.id;
          await order.save();

          for (const item of order.items) {
            await Book.findOneAndUpdate(
              { _id: item.book, stock: { $gte: item.quantity } },
              { $inc: { stock: -item.quantity } }
            );
          }

          const cart = await Cart.findOne({ user: order.user });
          if (cart) { cart.items = []; await cart.save(); }
        }
      }
    } else if (event.type === 'checkout.session.async_payment_failed') {
      const session = await stripe.checkout.sessions.retrieve(event.data.object.id);
      const orderId = session.metadata?.orderId;
      if (orderId) {
        const order = await Order.findById(orderId);
        if (order && order.paymentStatus === 'pending') {
          order.paymentStatus = 'failed';
          await order.save();
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    // A signature mismatch means the request did not come from Stripe.
    // Answer 400, not 500, and keep the SDK details out of the response.
    if (error?.type === 'StripeSignatureVerificationError') {
      return next(new AppError('Invalid webhook signature', 400));
    }
    next(error);
  }
};

// Verify the payment signature and, on success, create the order and clear cart.
const verifyPayment = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, shippingAddress, notes } = req.body;
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return next(new AppError('Missing payment details', 400));
    }
    if (!shippingAddress) {
      return next(new AppError('Shipping address is required', 400));
    }

    const keySecret = getKeySecret();
    if (!keySecret) return next(new AppError('Razorpay is not configured on the server', 503));
    const razorpay = getRazorpay();

    const expected = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expected !== razorpaySignature) {
      return next(new AppError('Payment verification failed', 400));
    }

    // Idempotency: if an order already exists for this razorpay order, return it.
    const existing = await Order.findOne({ razorpayOrderId });
    if (existing) {
      return res.json({ success: true, data: { order: existing } });
    }

    const { validItems, subtotal, shippingFee, tax, total } = await computeCartTotals(req.user._id);

    // The signature proves Razorpay issued this order, not that it was made for
    // this cart and user. Check the amount and owner against Razorpay's record.
    let rpOrder;
    try {
      rpOrder = await razorpay.orders.fetch(razorpayOrderId);
    } catch (error) {
      return next(toRazorpayError(error));
    }
    if (rpOrder.amount !== Math.round(total * 100) || rpOrder.notes?.userId !== String(req.user._id)) {
      return next(new AppError('Payment does not match your cart. Contact support with your payment ID.', 400));
    }

    const orderItems = validItems.map((item) => ({
      book: item.book._id,
      title: item.book.title,
      author: item.book.author,
      coverImage: item.book.coverImage,
      price: item.priceAtAdd,
      quantity: item.quantity,
    }));

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      subtotal,
      shippingFee,
      tax,
      total,
      status: 'pending',
      paymentStatus: 'paid',
      paymentMethod: 'razorpay',
      notes,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    for (const item of validItems) {
      await Book.findOneAndUpdate(
        { _id: item.book._id, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } }
      );
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) { cart.items = []; await cart.save(); }

    const createdOrder = await Order.findById(order._id).populate('user', 'name email').lean();
    res.status(201).json({ success: true, message: 'Payment verified', data: { order: createdOrder } });
  } catch (error) {
    next(error);
  }
};

export { createRazorpayOrder, verifyPayment, createStripeCheckout, handleStripeWebhook };
