import rateLimit from 'express-rate-limit';

// A standard JSON 429 so the API client surfaces a readable message.
const handler = (req, res) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please wait a moment and try again.',
  });
};

// Keep limits generous outside production so local development and the seed/test
// flows are not tripped up by repeated sign-ins.
const isDev = process.env.NODE_ENV !== 'production';

// Tight limit on credential endpoints to slow down brute-force attempts.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 500 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

// Generous limit for the rest of the API, mainly to blunt scraping.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 5000 : 600,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

// The dashboard runs several aggregation pipelines, so keep it calmer.
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDev ? 600 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

// Payment endpoints move real money and are worth extra protection against
// abuse and scripted card testing. The Stripe webhook is machine-to-machine
// and authenticated by signature, so it is skipped.
export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDev ? 600 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/webhook' || req.originalUrl.endsWith('/webhook'),
  handler,
});

// Public contact form: a human-only endpoint that would otherwise be a spam
// relay. Limited per IP (the default key) so a single source cannot flood
// the store inbox.
export const contactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: isDev ? 600 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

export default apiLimiter;
