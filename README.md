# Bookstore Application

A full-stack bookstore application with React (Vite) frontend and Node.js/Express/MongoDB backend.

## Project Structure

```
bookstore-app-upgraded/
├── backend/                 # Express.js backend API
│   ├── config/             # Database configuration
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Auth, validation, error handling
│   ├── models/             # Mongoose models
│   ├── routes/             # API routes
│   ├── utils/              # Utility functions
│   ├── server.js           # Express app entry point
│   ├── seed.js             # Database seeding script
│   ├── package.json
│   └── .env                # Environment variables
├── src/                    # React frontend
│   ├── api/                # API client
│   ├── context/            # React contexts (Auth, Cart) + useAuth/useCart hooks
│   ├── components/         # Shared components (Footer, Preloader, RouteGuards)
│   ├── data/               # Local data & API transformers
│   ├── pages/              # Auth + 404 pages
│   ├── user/               # User-facing components/pages
│   ├── admin/              # Admin panel
│   │   ├── components/     # AdminLayout, AdminHeader, Sidebar, Ui primitives
│   │   ├── pages/          # Dashboard, Books, Categories, Orders, Users
│   │   ├── hooks/          # useAsync (fetch with loading/error state)
│   │   └── utils/          # Money / date / number formatting
│   ├── utils/              # Utility functions
│   ├── App.jsx             # Main app component
│   ├── main.jsx            # Entry point
│   └── index.css           # Global styles
├── public/                 # Static assets (favicon, icons)
├── package.json
├── vite.config.js
└── .env                    # Frontend environment variables
```

## Features

### Frontend (React + Vite + Tailwind CSS)
- **Home Page**: Hero section, trending books, featured spotlight, genre navigation
- **All Books Page**: Search, filter by genre, sort, pagination
- **Book Detail Page**: Full book info, related books
- **Authentication**: Login/Register with JWT, password visibility toggle, role-aware redirects
- **User Profile**: Profile management, order history, password change
- **Shopping Cart**: Persistent cart with quantity management
- **Checkout**: Shipping address form, COD payment, order summary
- **Route Guards**: `/profile`, `/cart` and every `/admin/*` route are protected
  (`ProtectedRoute`, `AdminRoute`, `GuestRoute` in `src/components/RouteGuards.jsx`)

### Admin Panel (`/admin/*`, admin role required)
- **Dashboard**: live totals, orders-per-day chart, revenue-per-month trend,
  books-per-category donut, best sellers, recent orders, low-stock alerts
- **Books**: full CRUD, search + category filter, pagination, stock and discount
  display, hide/activate toggle. Deactivated books are visible to admins via the
  `includeInactive` flag and are hidden from the storefront
- **Categories**: full CRUD with book counts, slug auto-generation, search
- **Orders**: list with search/status filter, order detail drawer, status and
  payment-status updates
- **Users**: list with search/role filter, promote/demote, activate/deactivate,
  delete (the API refuses to remove the last admin or your own account)

### Backend (Node.js + Express + MongoDB)
- **Authentication**: JWT-based auth with HttpOnly cookies, bcrypt password hashing
- **User Management**: Registration, login, profile update, password change, role-based access
- **Book Management**: CRUD operations, search, filtering, pagination, featured books
- **Category Management**: CRUD operations with book counts
- **Shopping Cart**: Add/update/remove items, stock validation, price snapshots
- **Order Management**: Create orders from cart, stock decrement, order history, cancellation
  - Stock decrements use a guarded `$inc` so concurrent checkouts cannot drive
    stock negative; MongoDB transactions are used automatically when the
    deployment is a replica set (Atlas), with a sequential fallback for standalone
- **Admin Dashboard**: Overview stats, revenue, best-sellers, low stock, sales trends
- **Security**: Helmet, strict CORS allow-list, rate limiting (auth / api / admin /
  payments tiers), HttpOnly-cookie sessions with double-submit CSRF protection,
  input validation, markup sanitisation, regex escaping on search,
  prototype-pollution guard

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

## Installation

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm run seed  # Optional: seed sample data
npm run dev   # Development server with auto-reload
# or
npm start     # Production server
```

### Frontend

```bash
# From project root
npm install
cp .env.example .env  # If exists, or create .env with VITE_API_URL
npm run dev
```

## Environment Variables

### Backend (.env)

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/bookstore
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
CLIENT_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
# Optional: lax (default) | strict | none
# COOKIE_SAMESITE=lax
# Optional seed overrides (strong random passwords are generated if unset)
# SEED_ADMIN_PASSWORD=
# SEED_CUSTOMER_PASSWORD=
```

See `backend/.env.example` for the Razorpay/Stripe/Google keys – always use
placeholders there, never real credentials.

### Frontend (.env)

```env
VITE_API_URL=http://localhost:5000/api
# Optional; leave empty to hide the Google sign-in button
VITE_GOOGLE_CLIENT_ID=
```

`VITE_*` variables are bundled into the public JavaScript – never put secrets here.

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login user |
| POST | /api/auth/logout | Logout user |
| GET | /api/auth/me | Get current user |
| PUT | /api/auth/profile | Update profile |
| PUT | /api/auth/change-password | Change password |

### Books
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/books | List books (with filters, pagination) |
| GET | /api/books/featured | Get featured books |
| GET | /api/books/search | Search books |
| GET | /api/books/:id | Get book by ID |
| POST | /api/books | Create book (admin) |
| PUT | /api/books/:id | Update book (admin) |
| DELETE | /api/books/:id | Delete book (admin) |
| PATCH | /api/books/:id/stock | Update stock (admin) |
| GET | /api/books/covers/search | Find catalogue covers for a title/ISBN, with match checks (admin) |
| POST | /api/books/covers/upload | Upload a cover image, raw bytes, max 5 MB (admin) |

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/categories | List all categories |
| GET | /api/categories/:id | Get category by ID |
| POST | /api/categories | Create category (admin) |
| PUT | /api/categories/:id | Update category (admin) |
| DELETE | /api/categories/:id | Delete category (admin) |

### Cart (Auth Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/cart | Get user's cart |
| POST | /api/cart/items | Add item to cart |
| PUT | /api/cart/items/:bookId | Update item quantity |
| DELETE | /api/cart/items/:bookId | Remove item from cart |
| DELETE | /api/cart | Clear cart |

### Orders (Auth Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/orders | Create order from cart |
| GET | /api/orders/my-orders | Get user's orders |
| GET | /api/orders/:id | Get order details |
| PATCH | /api/orders/:id/cancel | Cancel order |

### Admin (Admin Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/dashboard | Dashboard statistics |
| GET | /api/admin/users | List all users |
| GET | /api/admin/users/:id | Get user details |
| GET | /api/admin/users/:id/orders | Get a user's orders |
| PUT | /api/admin/users/:id | Update user (name, phone, address, role, isActive) |
| DELETE | /api/admin/users/:id | Delete user |
| GET | /api/admin/orders | List all orders |
| GET | /api/admin/orders/:id | Get order details |
| PATCH | /api/admin/orders/:id/status | Update order/payment status |

Book and category mutations also require the admin role – see the Books and
Categories tables above. `GET /api/books?includeInactive=true` additionally
returns deactivated books, but only for admins (403 otherwise).

### Admin Frontend Routes
| Route | Module |
|-------|--------|
| /admin/dashboard | Live statistics and charts |
| /admin/books | Book CRUD |
| /admin/categories | Category CRUD |
| /admin/orders | Order list + status updates |
| /admin/users | User management |
| /admin/settings, /admin/resource | Placeholder pages inside the admin shell |

The older `/admin-dashboard`, `/admin-resource` and `/admin-settings` paths
still work and redirect to the equivalents above.

## Database Models

### User
- name, email (unique), password (hashed), role (customer/admin), isActive, address, phone

### Book
- title, author, description, price, originalPrice, coverImage, category (ref), isbn, series, volumeNumber, publisher, publishedYear, stock, language, rating, reviewCount, featured, isActive, colors, glyph
- `coverImage` is either a catalogue URL (e.g. Open Library) or `/uploads/covers/<uuid>.<ext>` for an uploaded file. Image bytes are never stored in MongoDB.

### Category
- name, slug (unique), description, image, isActive

### Cart
- user (ref, unique), items[{ book (ref), quantity, priceAtAdd }]

### Order
- user (ref), orderNumber (unique), items[{ book (ref), title, author, coverImage, price, quantity }], shippingAddress, subtotal, shippingFee, tax, total, status, paymentStatus, paymentMethod, notes

## Seeding Database

```bash
cd backend
npm run seed
```

Creates:
- 11 categories
- 18 books with images
- Admin user: admin@bookstore.com
- Test customer: customer@test.com

Passwords are read from `SEED_ADMIN_PASSWORD` / `SEED_CUSTOMER_PASSWORD`. If
they are not set, strong random passwords are generated and printed once during
seeding. Store them somewhere safe and rotate them after first login.

## Development

### Running Both Servers

1. Start MongoDB (local or use Atlas)
2. Start backend: `cd backend && npm run dev`
3. Start frontend: `npm run dev` (from project root)

Frontend runs on http://localhost:5173 (or 5174)
Backend runs on http://localhost:5000

### Health Check

```bash
curl http://localhost:5000/api/health
```

## Production Deployment

### Backend
1. Set NODE_ENV=production
2. Use strong JWT_SECRET
3. Use MongoDB Atlas or replica set for transactions
4. Set up proper CORS origins
5. Use PM2 or similar process manager
6. Configure reverse proxy (nginx)

### Frontend
1. Build: `npm run build`
2. Serve dist/ folder with nginx or static hosting
3. Set VITE_API_URL to production API URL

## Security Notes

- Passwords hashed with bcrypt (12 rounds)
- Sessions live in an **httpOnly cookie** (`SameSite=Lax` by default, `Secure` in
  production) – the JWT is never readable by JavaScript and never stored in
  localStorage
- **Double-submit CSRF protection** on every cookie-authenticated mutating
  request (`X-CSRF-Token` header must match the `csrfToken` cookie); requests
  authenticated with a Bearer header are exempt, as are the pre-session auth
  endpoints and the signature-verified Stripe webhook
- `COOKIE_SAMESITE=lax|strict|none` controls the cookie SameSite policy;
  `none` (for cross-site deployments) forces `Secure` and still enforces the
  CSRF check
- Frontend requests send `credentials: 'include'`; no token is ever exposed to JS
- Helmet for security headers (CSP, HSTS in production, X-Content-Type-Options,
  frame protection, CORP configured so the SPA can load `/uploads` images)
- Strict CORS allow-list from `CLIENT_URL`, with credentials enabled – no wildcard
- Input sanitization on all requests – markup, event handlers and `javascript:`
  URLs are stripped, while ordinary prose (`x < y`) is left untouched; raw
  byte payloads (Stripe webhook, image uploads) are skipped
- Prototype-pollution guard on `__proto__` / `constructor` / `prototype` keys
- Regex escaping on admin search fields, so input like `(` or `[` cannot 500 the query
- Rate limiting: `/api/auth` 20 req/15 min, `/api` 600 req/15 min,
  `/api/admin/dashboard` 60 req/min, `/api/payments` 30 req/min (Stripe webhook
  excluded; limits are relaxed automatically when `NODE_ENV` is not `production`)
- Express-validator for request validation
- Role-based access control (customer/admin), enforced on every admin route and
  mirrored in the UI by `AdminRoute`
- MongoDB injection protection via Mongoose + escaped regexes
- No sensitive data in frontend env variables (`VITE_*` is bundled into the
  public JS; only publishable keys belong there)
- Fail-fast startup in production: missing/short `JWT_SECRET` or missing
  `MONGO_URI` aborts the boot
- Uploads validated by magic bytes (JPEG/PNG/WebP/GIF), stored under random
  UUID names; `/uploads` is served with immutable caching and `fallthrough: false`
- Stripe webhook: raw-body signature verification, idempotent order settlement,
  amount checked against the server-side order

### Before deploying

1. **Rotate the keys that were in `backend/.env` and `backend/.env.example`**
   (Razorpay test secret, Stripe test secret, MongoDB Atlas DB password) if you
   ever shared or exposed them. `backend/.env.example` previously contained real
   test-mode keys – they are now placeholders, but treat history accordingly.
2. **Change the seeded passwords** (or set `SEED_ADMIN_PASSWORD` /
   `SEED_CUSTOMER_PASSWORD` before seeding) and rotate them after first login.
3. Set `NODE_ENV=production` – cookies become `Secure`, rate limits tighten,
   error responses stop leaking stack traces, and the server refuses to boot
   with weak config.
4. Use MongoDB Atlas or a replica set so order creation and cancellation run
   inside a transaction. In Atlas, restrict network access (IP allow-list or
   VPC peering) and use a least-privilege DB user (readWrite on `bookstore`
   only – never `atlasAdmin`).
5. Set `STRIPE_WEBHOOK_SECRET` to the signing secret from the Stripe Dashboard
   (Developers → Webhooks). Until then the webhook rejects all events (400).
6. Set `CLIENT_URL` to your production origin(s) exactly – credentials CORS
   accepts no wildcard. The auth cookie is `SameSite=Lax`, which works
   same-site (e.g. `app.example.com` + `api.example.com`). For cross-site
   deployments set `COOKIE_SAMESITE=none` (requires HTTPS; the CSRF double-submit
   check remains enforced).
7. Serve the frontend with the security headers in `public/_headers`
   (Netlify/Cloudflare Pages pick it up automatically). A Content-Security-Policy
   is deliberately not set there because it depends on your production API
   origin; a starting point:
   `default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src fonts.gstatic.com; script-src 'self' accounts.google.com/gsi/client checkout.razorpay.com; frame-src accounts.google.com checkout.razorpay.com; connect-src 'self' https://YOUR-API-ORIGIN`
8. Consider a `npm audit` in CI. As of this writing the backend reports 0
   vulnerabilities; the frontend has 6 moderate advisories in the dev-only ESLint
   toolchain (fixing them would downgrade ESLint; build output is unaffected).

### Data protection notes

- `.env` files are git-ignored and were never committed; git history contains
  no secrets. The Google OAuth **client ID** in the frontend env is public by
  design (it identifies, not authenticates, the app) – the corresponding client
  secret is not used anywhere.
- Access to the MongoDB cluster is the crown jewels: rotate the Atlas user
  password that lives in `backend/.env`, because it was shared in plain text
  with this workspace.

## Tech Stack

**Frontend:**
- React 19
- Vite 8
- React Router 7
- Tailwind CSS 4
- FontAwesome Icons
- Lucide React

**Backend:**
- Node.js
- Express 4
- MongoDB/Mongoose 8
- JWT (jsonwebtoken)
- bcryptjs
- express-validator
- Helmet
- Morgan
- cookie-parser

## Book Covers

Every book has its own cover reference. A book with no cover (or whose image fails to load) shows a neutral placeholder built from its own title, never another book's image.

**Adding or fixing a cover (admin panel):** Admin → Books → edit the book.
1. Fill in the ISBN, series and volume number.
2. Click **Find matching cover**. Results come from Open Library (and Google Books if `GOOGLE_BOOKS_API_KEY` is set), each labelled *Matches this book*, *Check carefully* or *Does not match*, with the reasons. Check the volume number and edition on the image, then click **Use this cover**.
3. If no correct result appears, click **Upload image** (JPEG/PNG/WebP/GIF, max 5 MB). The file is stored in `backend/uploads/covers/` under a unique name.
4. Save the book. Nothing changes until you save. **Remove cover** goes back to the placeholder.

**Auditing all books:** `cd backend && npm run covers` checks every book's cover (broken links, unreachable URLs, shared URLs, hotlinked images, invalid or duplicate ISBNs) and writes a JSON + Markdown report to `backend/reports/`. It changes nothing by default.
- `npm run covers -- --fix` applies the reviewed fixes.
- `npm run covers -- --fix --cache` also downloads reviewed remote covers into `backend/uploads/covers/` and stores the local path, so the storefront no longer depends on the remote host.
- `npm run covers -- --auto` also assigns covers to books not listed in `backend/data/verifiedCovers.js`, but only when the catalogue confirms both the ISBN and the volume.
- `npm run covers -- --fix --fix-isbn` replaces ISBNs that fail the checksum with the reviewed catalogue ISBN.

Reviewed cover assignments (source, verification date and notes) live in `backend/data/verifiedCovers.js`. Covers marked as wrong are cleared rather than replaced with unrelated artwork, and a temporary timeout or 5xx response is never treated as a broken link.

When an admin uploads a cover it is stored in `backend/uploads/covers/` and served from `/uploads/covers/<file>`; remote catalogue URLs remain supported. The same reference is used by the catalogue, search, series, book details, wishlist, cart and admin views. `backend/uploads/` is runtime data (gitignored), so copy it when deploying or re-run `npm run covers -- --fix --cache` on the target machine to restore local covers.

## License

MIT