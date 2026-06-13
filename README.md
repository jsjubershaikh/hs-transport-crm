# 🚌 Huzaifa Transportation CRM

A complete, production-grade **School Bus Management CRM** built on the **MERN stack** (MongoDB · Express · React · Node.js) with **real-time multi-admin synchronization** via Socket.io.

> Real MongoDB persistence · JWT auth · strict role-based access control · live cross-tab sync · 14 fully-functional pages · professional print-ready receipts.

---

## ✨ Features

- **Real authentication** — JWT (httpOnly cookie + bearer token), bcrypt-hashed passwords, auto-login on refresh.
- **Role-based access control** — enforced on the **server** (middleware + query scoping), not just hidden in the UI. A sub-admin requesting another route's data gets a hard **403**.
- **Real-time sync** — Socket.io rooms by role/route. When one admin collects a fee, every other relevant admin's dashboard, fee table and notification bell update instantly.
- **Fee management** — auto-creates 11 monthly records per student (Jun→Apr), partial payments, atomic receipt numbering (`HT-2025-0042`), WhatsApp/SMS reminder intents.
- **Academic years & promotion** — promote all students one class up (10 → Alumni), archive the old year, generate fresh fee seasons — transaction-guarded.
- **Reports & analytics** — MongoDB aggregation pipelines, Recharts visualizations, CSV/Excel/PDF export.
- **Premium UI** — Tailwind design system, skeleton loaders, empty states, custom toasts, smooth animations, fully responsive (mobile drawer, sticky tables).

---

## 🧱 Tech Stack

| Layer | Technology |
|------|------------|
| Frontend | React 18, Vite, React Router 6, Tailwind CSS, Recharts, lucide-react, socket.io-client, SheetJS (xlsx) |
| Backend | Node.js 20+, Express 4, Mongoose 8, Socket.io, JWT, bcryptjs, express-validator, helmet, cors |
| Database | MongoDB 6+ (local or Atlas) |

---

## 📁 Project Structure

```
huzaifa-transportation-crm/
├── package.json          # root scripts (concurrently runs both apps)
├── server/               # Express + MongoDB + Socket.io API
│   └── src/
│       ├── config/       # db + validated env loader
│       ├── models/       # 11 Mongoose schemas (indexes, hooks, virtuals)
│       ├── middleware/   # auth, rbac, validate, error handler
│       ├── controllers/  # one per resource
│       ├── routes/       # one express.Router() per resource
│       ├── services/     # fee / receipt / promotion / realtime / notification
│       ├── sockets/      # Socket.io auth + room joining
│       ├── utils/        # ApiError, activityLogger, token, query, withTransaction
│       └── seed/         # seed.js — realistic demo data
└── client/               # React + Vite SPA
    └── src/
        ├── api/          # axios instance, socket singleton, endpoint wrappers
        ├── context/      # AuthContext, UIContext, DataContext
        ├── hooks/        # useStudents, useFees, useRealtime, useCountUp, …
        ├── components/   # reusable component library
        ├── pages/        # the 14 pages
        ├── layouts/      # AuthLayout, DashboardLayout
        └── utils/        # format, exporters, constants
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 20+** and npm
- **MongoDB** — either:
  - a local MongoDB server running on `mongodb://127.0.0.1:27017`, **or**
  - a free **MongoDB Atlas** cluster (recommended — see below).

### 1. Install dependencies

```bash
npm run install:all
```

This installs the root, `server`, and `client` packages.

### 2. Configure environment

```bash
# Windows PowerShell
copy server\.env.example server\.env
copy client\.env.example client\.env

# macOS / Linux
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Then edit `server/.env`:

```ini
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/huzaifa_crm
JWT_SECRET=replace_with_a_long_random_string
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:5173
NODE_ENV=development
```

> **Using MongoDB Atlas?** Set `MONGODB_URI` to your Atlas SRV string, e.g.
> `mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/huzaifa_crm`

### 3. Seed the database

```bash
npm run seed
```

Wipes all collections and inserts realistic demo data: 2 academic years, 4 buses, 4 routes, 3 users, 30+ students, full fee records, receipts, notifications and activity logs. Prints a summary table on completion.

### 4. Run both apps

```bash
npm run dev
```

- API → http://localhost:5000/api
- App → http://localhost:5173

(Or run them separately with `npm run dev:server` and `npm run dev:client`.)

---

## 🔑 Demo Credentials

| Role | Username | Password | Scope |
|------|----------|----------|-------|
| **Super Admin** | `admin` | `admin123` | Everything, all routes |
| **Sub Admin 1** | `route1admin` | `pass123` | Andheri East Circuit only |
| **Sub Admin 2** | `route2admin` | `pass123` | Bandra–Khar Line only |

> **Try the real-time sync:** open the app in two browser windows, log in as `admin` in one and `route1admin` in the other. Collect a fee as the sub-admin and watch the super-admin's dashboard, fee table and notification bell update instantly.

---

## 🏛️ Architecture Overview

- **Envelope** — every API response is `{ success, data, meta? }` or `{ success:false, error:{ message, code, fields? } }`.
- **Auth** — `POST /api/auth/login` signs a 7-day JWT, sets it as an httpOnly cookie **and** returns it in the body. `GET /api/auth/me` powers auto-login on refresh.
- **RBAC** — `middleware/rbac.js` exposes `requireRole(...)`, `scopeFilter(req)` (forces `routeId` into every query for sub-admins) and `ensureRouteAccess(req, routeId)` (hard 403 on cross-route access by id).
- **Real-time** — sockets authenticate via the JWT handshake and join rooms `role:{role}` and `route:{id}`. `services/realtime.js#emitToScope` always also emits to `role:superadmin` so super-admins see every change.
- **Fees** — `feeService` creates the 11-month season; `receiptService` issues collision-free receipt numbers via an atomic counter document.
- **Promotion** — `promotionService` clones active students into the next year with bumped classes and fresh fee records, archives the old year, all inside `withTransaction` (gracefully degrades to a guarded run on standalone MongoDB).

---

## 🌱 Production / Scaling Notes

The codebase includes inline comments at the relevant spots for:

- **Compound indexes** for 10,000+ students (already declared on each model).
- Moving base64 images to **GridFS / S3 / Cloudinary**.
- Plugging real **WhatsApp Business API / Twilio / MSG91** into `/api/fees/reminders`.
- Server-side **PDF generation** (pdfkit / puppeteer) instead of browser print.
- **Refresh-token rotation** + shorter access-token expiry.
- A **Redis adapter** to scale Socket.io across instances.
- **MongoDB transactions** for promotion + fee collection (and why they matter).
- **Redis caching** for aggregation-heavy dashboard/report endpoints.

---

## 📜 Scripts

| Command | Description |
|---------|-------------|
| `npm run install:all` | Install root + server + client deps |
| `npm run seed` | Wipe & seed the database with demo data |
| `npm run dev` | Run server + client together (concurrently) |
| `npm run dev:server` | Run only the API (nodemon) |
| `npm run dev:client` | Run only the Vite dev server |
| `npm start` | Start the API in production mode |

---

## 🧭 The 14 Pages

Landing · Login · Dashboard · Add Student · Student List · Student Profile · Fee Management · Receipts · Routes · Buses · Sub Admins · Academic Years & Promotion · Reports · Archive · Notifications · Settings.

(Sub-admins see a scoped subset: Dashboard, Students, Fees, Receipts, Notifications.)

---

Built with care to look and feel like a premium SaaS product. 🚍
