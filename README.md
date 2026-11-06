# Anime Bookstore — Backend API

Node.js + Express + MongoDB (Mongoose) backend for the Anime Bookstore. The frontend (React/Vite) is deployed separately.

- **Repository:** https://github.com/mhdfarheen60-star/Anime-Bookstore
- **Backend path:** `/backend` (Render **Root Directory** must be `backend`)

## Features
- JWT auth (httpOnly cookie) + CSRF double-submit, bcrypt passwords
- Roles/authorization (`customer`/`admin`), protected admin routes
- Books, categories, blog, cart, orders, wishlist, users, dashboard
- Payments: Razorpay + Stripe Checkout (server-side totals/verification; Stripe webhook signature verified)
- File uploads served from `/uploads` (avatars/covers/blog images)
- Security: Helmet, explicit CORS (credentials), rate limiting, validation/sanitization, body limits

## Local development
```bash
cd backend
npm install
cp .env.example .env   # fill in values (never commit .env)
npm run dev            # node --watch server.js
# or
npm start              # node server.js
```

## Environment variables
See `backend/.env.example`. Required for production: `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET` (>= 32 chars), and `CLIENT_URL`/`FRONTEND_URL` for CORS (plus Stripe/Razorpay/Google vars as used).

## API
- Health: `GET /api/health` (200 when DB connected; 503 when disconnected)
- Base: `/api/*` (auth, books, blog, categories, cart, orders, wishlist, payments, admin routes)

## Render (backend Web Service)
- **Root Directory:** `backend`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Health Check Path:** `/api/health`
- Set env vars in Render (do not commit secrets). Cross-site frontend+backend typically needs `COOKIE_SAMESITE=none` over HTTPS and `VITE_API_URL=https://<backend>/api` on the frontend.

## Notes
- Render filesystem is ephemeral: `/uploads` are not durable across deploys/restarts; use object storage (S3/Cloudinary/R2) for production durability.
- No MongoDB data is stored in this repo. Never commit `.env` or secrets.
