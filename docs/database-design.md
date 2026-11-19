# Database Design — SIRASMA

> [!WARNING]
> Dokumen ini masih dalam tahap **draft awal**. Schema final akan didefinisikan dan disepakati bersama pada **Task 02** sebelum migrasi database dijalankan.

---

## Teknologi

- **Database:** PostgreSQL 17
- **ORM:** Prisma 6.x
- **Connection:** Via `DATABASE_URL` environment variable

---

## Prinsip Desain

1. **Soft delete** — Data penting tidak dihapus permanen; gunakan kolom `deletedAt`.
2. **Timestamps standar** — Setiap tabel memiliki `createdAt` dan `updatedAt`.
3. **UUID** — Primary key menggunakan UUID v4 untuk keamanan dan distribusi.
4. **Enum** — Status dan tipe data dikontrol menggunakan PostgreSQL enum via Prisma.
5. **Normalisasi** — Ikuti 3NF untuk mencegah redundansi data.

---

## Entitas Utama (Draft)

Entitas-entitas berikut diidentifikasi dari ruang lingkup proyek. Detail kolom dan relasi akan ditentukan di Task 02.

| Entitas | Keterangan |
|---|---|
| `User` | Data pengguna sistem (mahasiswa, staff, admin) |
| `Room` | Data kamar asrama |
| `RoomType` | Tipe/kategori kamar (single, double, dll) |
| `Building` | Gedung/blok asrama |
| `Reservation` | Transaksi reservasi kamar |
| `Payment` | Data pembayaran reservasi |
| `Announcement` | Pengumuman dari admin/staff |

---

## Status Prisma Saat Ini

Schema Prisma minimal sudah dikonfigurasi:
- `datasource db` — terhubung ke PostgreSQL via `DATABASE_URL`
- `generator client` — Prisma Client untuk Node.js

**Belum ada model** yang didefinisikan. Migrasi belum dijalankan.

---

## Lokasi Schema

```
apps/backend/prisma/schema.prisma
```

---

## Langkah Selanjutnya (Task 02)

- [ ] Desain ERD lengkap
- [ ] Definisikan semua model Prisma
- [ ] Review dan persetujuan schema
- [ ] Jalankan migrasi awal: `prisma migrate dev --name init`
- [ ] Seed data dasar (opsional)

