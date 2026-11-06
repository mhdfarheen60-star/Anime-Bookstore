// Double-submit CSRF protection for cookie-authenticated requests.
//
// Browsers send cookies automatically, so a cross-site page could otherwise
// fire mutating requests at our API with the visitor's session attached.
// The double-submit pattern defeats this without server-side state:
//
//   1. On login/register/password change we set a random token in a
//      NON-httpOnly cookie (`csrfToken`) and also return it in the JSON body.
//      The frontend keeps it (memory + sessionStorage) and echoes it back in
//      the `X-CSRF-Token` header on every mutating request.
//   2. For mutating requests that rely on the cookie (i.e. no Authorization
//      header), the server requires the header to match the cookie exactly.
//      A cross-site attacker can make the browser SEND the cookie but cannot
//      READ it to copy into the header, so forged requests are rejected.
//
// Requests carrying an `Authorization: Bearer` header are skipped – a Bearer
// token is never attached ambiently by the browser, so it needs no CSRF cover.

import crypto from 'node:crypto';

export const CSRF_COOKIE_NAME = 'csrfToken';
export const CSRF_HEADER_NAME = 'x-csrf-token';

export const generateCsrfToken = () => crypto.randomBytes(32).toString('hex');

export const setCsrfCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const sameSite = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase();
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // the SPA must be able to read it
    secure: isProduction || sameSite === 'none',
    sameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000, // match the auth token lifetime
    path: '/',
  });
};

export const clearCsrfCookie = (res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const sameSite = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase();
  res.cookie(CSRF_COOKIE_NAME, '', {
    httpOnly: false,
    secure: isProduction || sameSite === 'none',
    sameSite,
    maxAge: 0,
    path: '/',
  });
};

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Paths that must stay reachable without a CSRF header: they happen before a
// session exists, or carry their own cryptographic verification (Stripe webhook).
const EXEMPT_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/google',
  '/api/auth/logout',
  '/api/payments/webhook',
  '/api/health',
];

const safeEqual = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Express middleware. Rejects mutating, cookie-authenticated requests that do
 * not echo the CSRF cookie in the X-CSRF-Token header.
 */
export const csrfProtection = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  if (EXEMPT_PATHS.some((p) => req.path === p || req.path.startsWith(`${p}/`))) return next();
  // Bearer-authenticated requests are not ambient; no CSRF risk.
  if (req.headers.authorization) return next();
  // If the client did not present a session cookie at all, leave auth to the
  // route's own middleware (typically responds 401).
  if (!req.cookies?.token) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME];
  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token missing or invalid. Please refresh the page and try again.',
    });
  }
  next();
};
