# SIRASMA

**Sistem Informasi Reservasi Asrama ULBI**

Aplikasi web untuk manajemen dan reservasi kamar asrama Universitas Logistik dan Bisnis Internasional (ULBI).

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Animation | Framer Motion |
| Backend | NestJS + TypeScript |
| Database | PostgreSQL 17 |
| ORM | Prisma |
| Package Manager | pnpm (Workspace Monorepo) |

---

## Prasyarat

- Node.js >= 20
- pnpm >= 9
- PostgreSQL 17

---

## Setup

```bash
# 1. Salin file environment
cp .env.example .env
# Isi DATABASE_URL, JWT_ACCESS_SECRET, dan CSRF_SECRET acak (masing-masing
# minimal 32 karakter) di .env. Atur FRONTEND_ORIGINS untuk domain browser.
# Backend tidak akan mulai tanpa secret yang valid.

# 2. Install semua dependency
pnpm install

# 3. Inisialisasi database (setelah schema disepakati)
pnpm -C apps/backend prisma migrate dev
```

---

## Menjalankan Aplikasi

```bash
# Frontend saja (http://localhost:5173)
pnpm dev:frontend

# Backend saja (http://localhost:3000)
pnpm dev:backend

# Frontend + Backend bersamaan
pnpm dev
```

---

## Struktur Monorepo

```
sirasma/
├── apps/
│   ├── frontend/   # React + Vite
│   └── backend/    # NestJS
├── docs/           # Dokumentasi proyek
├── .env.example
├── package.json
└── pnpm-workspace.yaml
```

---

## Dokumentasi

Lihat folder [`docs/`](./docs/) untuk detail arsitektur, desain database, dan konvensi API.

---

## Status

> 🏗️ Task 01 — Fondasi Monorepo (selesai)

## Catatan keamanan autentikasi

- Rate limiting auth saat ini bersifat in-memory per instance. Deployment
  multi-instance perlu shared store seperti Redis agar limit berlaku global.
- Refresh/logout membutuhkan Origin yang diizinkan dan header CSRF token dari
  `GET /api/auth/csrf`. Refresh cookie tetap HttpOnly dan tidak dibaca JavaScript.

