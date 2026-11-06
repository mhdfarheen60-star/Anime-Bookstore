import { validationResult } from 'express-validator';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
    });
  }
  next();
};

// Strip markup and dangerous URL schemes from every string that arrives in a
// request, while leaving ordinary prose untouched.
//
// The previous implementation deleted every '<' and '>' character, which had two
// problems:
//   1. It corrupted legitimate text ("If x < y then z > w" became "If x  y then z  w").
//   2. It was not real protection, since "<script>" simply became "script".
// Now we remove actual tags, event handlers and script: URLs instead.
const stripMarkup = (value) =>
  value
    // <script>/<style> blocks including their contents
    .replace(/<(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    // any remaining complete tag
    .replace(/<\/?[a-z][^>]*>/gi, '')
    // inline event handlers: onclick=, onerror=, ...
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // dangerous URL schemes
    .replace(/(javascript|vbscript|data)\s*:/gi, '')
    // control characters that have no business in stored text
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

const sanitizeString = (value) => stripMarkup(value).trim();

const sanitize = (obj) => {
  if (typeof obj === 'string') return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(sanitize);
  if (obj && typeof obj === 'object') {
    // Guard against prototype pollution via crafted keys such as "__proto__".
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      sanitized[key] = sanitize(value);
    }
    return sanitized;
  }
  return obj;
};

export const sanitizeInput = (req, res, next) => {
  try {
    // Raw byte payloads (Stripe webhook, image uploads) must not be treated
    // as JSON objects – iterating them byte by byte destroys the payload.
    if (Buffer.isBuffer(req.body)) return next();
    // NOTE: express populates req.query/req.params as own, writable properties,
    // so reassigning them is safe on Express 4 (Express 5 makes req.query a
    // getter, which would throw here).
    if (req.body) req.body = sanitize(req.body);
    if (req.query) req.query = sanitize(req.query);
    if (req.params) req.params = sanitize(req.params);
  } catch (error) {
    return next(error);
  }
  next();
};
