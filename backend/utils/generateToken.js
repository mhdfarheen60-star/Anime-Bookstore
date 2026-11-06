import jwt from 'jsonwebtoken';

export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

export const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// Cookie SameSite policy is configurable because the right value depends on
// how the frontend and API are deployed:
//   - same-site (default 'lax'): works for localhost and for deployments on
//     one site, e.g. app.example.com + api.example.com. Browsers withhold the
//     cookie on cross-site POSTs, which defeats classic CSRF.
//   - cross-site ('none'): required when the SPA and API live on different
//     sites (e.g. Vercel frontend + Render backend). Must be paired with
//     HTTPS and our double-submit CSRF token (see utils/csrf.js).
const getSameSite = () => {
  const value = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase();
  return ['lax', 'strict', 'none'].includes(value) ? value : 'lax';
};

const baseCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const sameSite = getSameSite();
  return {
    httpOnly: true,
    // Browsers reject SameSite=None cookies that are not Secure.
    secure: isProduction || sameSite === 'none',
    sameSite,
    path: '/',
  };
};

export const setTokenCookie = (res, token) => {
  res.cookie('token', token, {
    ...baseCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const clearTokenCookie = (res) => {
  res.cookie('token', '', {
    ...baseCookieOptions(),
    maxAge: 0,
  });
};
