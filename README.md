# Shoqata Dituria

Website for Shoqata Kulturore-Arsimore "Dituria", a cultural and educational
association in Preševo. The public site is in **Albanian** and shows the
association's activities by year. A private admin panel lets the team
publish posts with photos.

The repo has two apps: `frontend/` (React + Vite) and `backend/` (Express +
MySQL).

---

## What's inside

**Public site**
- Home, About, Contact
- Activities: posts grouped by year (`/activities/:year`; `/activities`
  opens the latest year)
- Post page with cover image and gallery (`/posts/:slug`)
- Contact form sent through Web3Forms

**Admin panel (`/admin`)**
- Login with email + password, optional two-factor code (TOTP, set up with a
  QR code)
- Forgot password and lost-2FA flows by email
- Posts: create, edit, delete; draft / published / archived; categories;
  cover image + multiple gallery images
- Activity years: add or remove the years shown on the site
- Dashboard with the latest admin log entries

**Security**
- Short-lived JWT access token + refresh token in an httpOnly cookie
  (refresh tokens are stored in the database and can be revoked)
- Account lock for 15 minutes after 8 wrong passwords
- Rate limits: 120 requests/min on the API, 20 per 10 min on auth routes
- Helmet headers, CORS limited to `FRONTEND_URL` and localhost

---

## Tech stack

| Area | Tool |
|---|---|
| Frontend | React 19, Vite, React Router, Framer Motion, react-icons, plain CSS |
| Backend | Node.js, Express 4 (ES modules) |
| Database | MySQL (`mysql2`) |
| Auth | jsonwebtoken, bcrypt, speakeasy (TOTP) + qrcode |
| Images | multer (in memory, 5 MB max) → sharp → WebP, stored in MySQL |
| Email | Nodemailer (SMTP) |
| Contact form | Web3Forms |

---

## Getting started

You need Node.js and a MySQL database.

```bash
# backend
cd backend
npm install
# create backend/.env (see below)
npm run dev                 # http://localhost:5000

# frontend, in a second terminal
cd frontend
npm install
# create frontend/.env (see below)
npm run dev                 # http://localhost:5173
```

Create the first admin (also resets the password if the email exists):

```bash
cd backend
npm run seed:admin -- <email> <password>
```

> [!WARNING]
> `npm run create:tables` (`scripts/createTables.js`) is **out of date**.
> The code stores images as binary data (`posts.coverImage` +
> `coverImageMime`, `post_images.image` + `imageMime`), but the script still
> creates URL columns for them. Fix the script before using it on a new
> database.

---

## Environment variables

`.gitignore` excludes every `.env.*` file, so there is no example file in the
repo.

**`backend/.env`**

| Variable | What it's for |
|---|---|
| `PORT` | API port (default 5000) |
| `FRONTEND_URL` | Site URL, allowed by CORS and used in email links |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection |
| `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES` | Access token signing key and lifetime |
| `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_HOURS` | Refresh token signing key and JWT lifetime (default 24) |
| `JWT_REFRESH_EXPIRES_DAYS` | How long a stored refresh token stays valid (default 14) |
| `COOKIE_SECURE` | `true` in production (HTTPS-only refresh cookie) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Outgoing email (password reset, 2FA reset) |
| `EMAIL_FROM` | Sender address (defaults to `SMTP_USER`) |

**`frontend/.env`**

| Variable | What it's for |
|---|---|
| `VITE_API_URL` | Backend URL (default `http://localhost:5000`) |
| `VITE_WEB3FORMS_KEY` | Web3Forms access key for the contact form |

---

## Scripts

**backend/**

| Command | What it does |
|---|---|
| `npm run dev` | API with nodemon (restarts on change) |
| `npm start` | API with node |
| `npm run seed:admin -- <email> <password>` | Create an admin, or reset an existing admin's password |
| `npm run create:tables` | Create the MySQL tables (out of date, see above) |

**frontend/**

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the build locally |
| `npm run lint` | ESLint |

---

## API

| Route | Auth | What |
|---|---|---|
| `POST /api/auth/login`, `/refresh`, `/logout` | – | Sign in (with `twoFactorCode` when 2FA is on), refresh, sign out |
| `GET /api/auth/me` | yes | Current admin |
| `POST /api/auth/forgot-password`, `/reset-password` | – | Password reset by email |
| `POST /api/auth/2fa-reset/request`, `/2fa-reset/confirm` | – | Turn off 2FA by email link |
| `POST /api/auth/2fa/setup`, `/enable`, `/disable` | yes | Manage 2FA |
| `GET /api/posts`, `GET /api/posts/:slug` | – | List posts, one post |
| `GET /api/posts/:id/cover`, `GET /api/posts/image/:imageId` | – | Images (served from the database) |
| `GET /api/posts/categories/all` | – | Categories |
| `POST /api/posts`, `PUT /api/posts/:id`, `DELETE /api/posts/:id` | yes | Manage posts (multipart for images) |
| `GET /api/years`, `POST /api/years`, `DELETE /api/years/:year` | GET public | Activity years |
| `GET /api/admin-logs` | yes | Admin activity log |
| `GET /api/health` | – | Health check |
| `GET /api/test-email` | – | Sends a test email to `SMTP_USER` |

---

## Project structure

```
backend/
  server.js              Express app: middleware, CORS, routes
  config/
    database.js          MySQL pool
    authRoutes.js        auth routes (this is the file server.js mounts)
  routes/                posts, years, admin logs
  models/                Admin, Post, tokens (SQL helpers)
  middleware/            auth (JWT), rate limits, image upload
  lib/                   email, image processing, JWT, 2FA, slugs, logger
  scripts/               seedAdmin.js, createTables.js, testDb.js
frontend/
  src/
    App.jsx              routes (public + /admin)
    pages/               public pages; pages/admin/ for the panel
    components/          Navbar, Hero, Footer, PostGrid, ProtectedAdmin
    context/             auth state (access token, current admin)
    api/                 fetch helpers for auth, posts, years
    data/content.js      navigation and year list
    styles/              global + admin theme CSS
```

Not used by the running app: `backend/routes/authRoutes.js` (older copy of
the auth routes), `routes/contactRoutes.js` and `routes/categoryTagRoutes.js`
(not mounted), and `seed/superadmin.js` (left over from MongoDB).

---

## Deployment

A comment in `server.js` says the API runs on **Railway**; set
`FRONTEND_URL` there so CORS lets the site through. The frontend builds to a
static `dist/` folder and can go on any static host. Set `VITE_API_URL` to
the API's public URL before building.
