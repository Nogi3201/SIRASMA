# API Conventions — SIRASMA

## Base URL

```
Development : http://localhost:3000/api
Production  : https://<domain>/api
```

---

## Versi API

Semua endpoint diawali dengan prefix `/api`. Versioning akan diterapkan saat ada breaking change:

```
/api/v1/rooms
/api/v1/reservations
```

Untuk saat ini (development awal), cukup gunakan `/api/`.

---

## Format Response

### Sukses

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Sukses dengan Pagination

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

### Error

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Deskripsi error yang jelas",
  "errors": [ "Detail error 1", "Detail error 2" ]
}
```

---

## HTTP Status Codes

| Kode | Makna | Kapan Digunakan |
|---|---|---|
| `200 OK` | Sukses | GET, PUT, PATCH berhasil |
| `201 Created` | Dibuat | POST berhasil membuat resource |
| `204 No Content` | Tanpa isi | DELETE berhasil |
| `400 Bad Request` | Input invalid | Validasi gagal |
| `401 Unauthorized` | Belum login | Token tidak ada/invalid |
| `403 Forbidden` | Tidak punya hak | Role tidak mencukupi |
| `404 Not Found` | Tidak ditemukan | Resource tidak ada |
| `409 Conflict` | Konflik | Data duplikat |
| `422 Unprocessable` | Logika bisnis gagal | Contoh: kamar sudah penuh |
| `500 Internal Error` | Server error | Kesalahan server |

---

## Naming Convention

### Endpoint

- Gunakan **noun**, bukan verb.
- Gunakan **kebab-case** untuk multi-kata.
- Gunakan **plural** untuk koleksi resource.

```
✅ GET  /api/rooms
✅ GET  /api/rooms/:id
✅ POST /api/rooms
✅ GET  /api/room-types
✅ GET  /api/reservations/:id/payments

❌ GET  /api/getRoom
❌ POST /api/createReservation
```

### Request Body (DTO)

- Gunakan **camelCase** untuk field JSON.
- Validasi menggunakan `class-validator` di NestJS.

```json
{
  "roomTypeId": "uuid",
  "checkInDate": "2026-01-15",
  "checkOutDate": "2026-06-30"
}
```

---

## Autentikasi

- Menggunakan **JWT Bearer Token**.
- Token dikirim melalui header `Authorization: Bearer <token>`.
- Refresh token menggunakan endpoint terpisah.

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## Pagination

Gunakan query params standar:

```
GET /api/rooms?page=1&limit=10&sort=createdAt&order=desc
```

| Param | Default | Keterangan |
|---|---|---|
| `page` | `1` | Halaman ke- |
| `limit` | `10` | Jumlah item per halaman (max: 100) |
| `sort` | `createdAt` | Field untuk sorting |
| `order` | `desc` | `asc` atau `desc` |

---

## Filtering & Search

```
GET /api/rooms?status=AVAILABLE&type=SINGLE
GET /api/users?search=Ahmad
```

---

## Endpoints Tersedia (Task 01)

| Method | Path | Deskripsi |
|---|---|---|
| `GET` | `/health` | Health check server |

> Endpoint bisnis akan didefinisikan mulai Task 03+.

---

## Tanggal & Waktu

- Format: **ISO 8601** (`2026-01-15T08:00:00.000Z`).
- Timezone: UTC di database, konversi ke WIB (UTC+7) di frontend.

