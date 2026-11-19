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
# Isi nilai DATABASE_URL dan variabel lainnya di .env

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

