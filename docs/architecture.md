# Architecture — SIRASMA

## Gambaran Umum

SIRASMA menggunakan arsitektur **monorepo** dengan pemisahan yang jelas antara frontend dan backend, dikelola menggunakan **pnpm Workspace**.

```
sirasma/                        ← Root monorepo
├── apps/
│   ├── frontend/               ← React SPA
│   └── backend/                ← NestJS REST API
└── docs/                       ← Dokumentasi proyek
```

---

## Stack Teknologi

### Frontend

| Teknologi | Versi | Fungsi |
|---|---|---|
| React | 19.x | UI library |
| TypeScript | 7.x | Type safety |
| Vite | 8.x | Build tool & dev server |
| Tailwind CSS | 4.x | Utility-first styling |
| shadcn/ui | latest | Component library (Task 02) |
| Framer Motion | 14.x | Animasi UI |

### Backend

| Teknologi | Versi | Fungsi |
|---|---|---|
| NestJS | 11.x | Node.js framework |
| TypeScript | 5.x | Type safety |
| Prisma | 6.x | ORM & schema management |
| PostgreSQL | 17 | Database relasional |
| @nestjs/config | — | Environment management |

### Tooling

| Tool | Fungsi |
|---|---|
| pnpm 12.x | Package manager & workspace |
| concurrently | Jalankan frontend+backend bersamaan |
| oxlint | Linting (frontend) |

---

## Arsitektur Frontend

```
src/
├── components/     ← Komponen UI reusable (atom/molekul)
├── features/       ← Fitur bisnis terpisah (auth, booking, dll)
│   └── <feature>/
│       ├── components/
│       ├── hooks/
│       └── types.ts
├── layouts/        ← Layout halaman (MainLayout, AuthLayout)
├── pages/          ← Halaman (route-level components)
├── hooks/          ← Custom hooks global
├── services/       ← API calls (fetch/axios abstraction)
├── lib/            ← Utilities, config, constants
└── types/          ← TypeScript types/interfaces global
```

**Import Alias:** `@/` dipetakan ke `src/`.

---

## Arsitektur Backend

```
src/
├── health/             ← Health check module
├── app.module.ts       ← Root module
├── app.controller.ts   ← Root controller
├── app.service.ts      ← Root service
└── main.ts             ← Entry point
```

**Pola yang digunakan:** NestJS Module System — setiap domain fitur dipisah menjadi module mandiri.

Contoh struktur fitur (future):
```
src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── dto/
├── rooms/
│   ├── rooms.module.ts
│   ...
```

---

## Alur Komunikasi

```
Browser (React SPA)
        │  HTTP REST (JSON)
        ▼
NestJS API (port 3000)
        │  Prisma Client
        ▼
PostgreSQL 17 (port 5432)
```

---

## Environment & Konfigurasi

| Variabel | Lokasi | Keterangan |
|---|---|---|
| `DATABASE_URL` | `.env` | Koneksi PostgreSQL |
| `NODE_ENV` | `.env` | `development` / `production` |
| `BACKEND_PORT` | `.env` | Port backend (default 3000) |
| `VITE_API_BASE_URL` | `.env` | Base URL API untuk frontend |

> File `.env` tidak pernah di-commit. Gunakan `.env.example` sebagai template.

---

## Port Development

| Layanan | Port |
|---|---|
| Frontend (Vite) | 5173 |
| Backend (NestJS) | 3000 |
| PostgreSQL | 5432 |

