# Database Design — SIRASMA

> [!NOTE]
> Database PostgreSQL telah berhasil disinkronkan melalui Prisma Introspection pada **Task 02**. Seluruh struktur 35 tabel dan 26 enum pada schema `public` telah dipetakan secara akurat ke dalam `schema.prisma`.

---

## Teknologi

- **Database:** PostgreSQL 17
- **Database Name:** `sirasma_db`
- **ORM:** Prisma 6.19.3
- **Connection:** Via `DATABASE_URL` environment variable

---

## Prinsip Desain & Konvensi

1. **UUID Primary Keys:** Seluruh tabel menggunakan UUID v4 (`@default(dbgenerated("gen_random_uuid()")) @db.Uuid`).
2. **Timestamps:** Menggunakan `Timestamptz(6)` untuk tanggal audit (`created_at`, `updated_at`).
3. **Strict Enums:** Status dan tipe kategori dikelola menggunakan PostgreSQL native ENUM type (26 enum terdaftar).
4. **Presisi Finansial:** Kolom moneter/biaya menggunakan `Decimal(14, 2)` dan kuantitas menggunakan `Decimal(10, 2)`.
5. **Jaringan & Audit:** Menggunakan tipe PostgreSQL native `@db.Inet` untuk `ip_address` dan `Json` untuk `old_values`/`new_values` pada `audit_logs`.

---

## Daftar Model Terintrospeksi (35 Model)

| No | Nama Model / Tabel | Kategori / Fungsi |
|---|---|---|
| 1 | `academic_periods` | Periode akademik & jendela registrasi |
| 2 | `academic_verifications` | Verifikasi status akademik mahasiswa |
| 3 | `audit_logs` | Catatan audit trail sistem (JSON & IP) |
| 4 | `buildings` | Gedung asrama & kebijakan gender |
| 5 | `check_ins` | Pencatatan check-in penghuni |
| 6 | `check_out_requests` | Pengajuan & validasi check-out |
| 7 | `facilities` | Master data fasilitas asrama |
| 8 | `group_invitations` | Undangan reservasi kamar berkelompok |
| 9 | `housing_extensions` | Pengajuan perpanjangan masa tinggal |
| 10 | `invoice_items` | Rincian item tagihan (kuantitas, tarif) |
| 11 | `invoices` | Data faktur/tagihan pembayaran |
| 12 | `notification_attempts` | Percobaan pengiriman notifikasi |
| 13 | `notifications` | Data antrean & riwayat notifikasi pengguna |
| 14 | `otp_verifications` | Verifikasi kode OTP & percobaan |
| 15 | `payment_proofs` | Bukti transfer/pembayaran yang diunggah |
| 16 | `payments` | Transaksi pembayaran & gateway |
| 17 | `receipts` | Tanda terima/kwitansi pembayaran |
| 18 | `refunds` | Transaksi pengembalian dana |
| 19 | `reservation_group_members` | Anggota grup reservasi |
| 20 | `reservation_groups` | Grup reservasi kamar |
| 21 | `reservation_status_histories` | Log riwayat perubahan status reservasi |
| 22 | `reservations` | Transaksi reservasi utama kamar |
| 23 | `room_assignments` | Penempatan kamar & status hunian |
| 24 | `room_facilities` | Pemetaan fasilitas per kamar |
| 25 | `room_rates` | Tarif harga sewa kamar & masa berlaku |
| 26 | `room_transfer_requests` | Pengajuan perpindahan kamar |
| 27 | `rooms` | Master data kamar & kapasitas |
| 28 | `staff_profiles` | Profil khusus petugas/staff |
| 29 | `student_documents` | Dokumen persyaratan mahasiswa |
| 30 | `student_profiles` | Profil akademik & personal mahasiswa |
| 31 | `system_settings` | Parameter konfigurasi aplikasi |
| 32 | `users` | Akun pengguna utama (ADMIN, STAFF, USER) |
| 33 | `waiting_list_entries` | Entri antrean waiting list |
| 34 | `waiting_list_offers` | Penawaran kamar untuk antrean |
| 35 | `waiting_lists` | Master antrean waiting list per periode |

---

## Daftar Enum Terintrospeksi (26 Enum)

1. `academic_status`
2. `assignment_status`
3. `attempt_status`
4. `check_out_status`
5. `document_status`
6. `document_type`
7. `gender_policy`
8. `group_member_status`
9. `group_status`
10. `invitation_status`
11. `invoice_status`
12. `notification_status`
13. `offer_status`
14. `otp_channel`
15. `otp_purpose`
16. `payment_method`
17. `payment_status`
18. `proof_status`
19. `refund_status`
20. `request_status`
21. `reservation_status`
22. `room_status`
23. `user_role`
24. `verification_status`
25. `waiting_entry_status`
26. `waiting_queue_type`

---

## Keterbatasan Fitur PostgreSQL pada Prisma

Prisma Client mendukung hampir seluruh tipe data PostgreSQL modern, namun memiliki catatan berikut:

1. **Check Constraints (25 Batasan):**
   * Prisma tidak memvalidasi `CHECK constraint` di application layer. Validasi ini tetap aktif dan dieksekusi secara aman oleh PostgreSQL engine.
2. **Exclusion Constraints (`room_rates`):**
   * Constraint `room_rates_room_id_daterange_excl` (mencegah tumpang tindih tarif kamar berdasarkan rentang tanggal) tidak dimodelkan langsung di Prisma DSL, namun tetap ditegakkan oleh PostgreSQL.
3. **Database Comments:**
   * Komentar SQL pada tabel `audit_logs`, `check_out_requests`, `invoices`, `room_assignments`, dan `student_documents` ditandai oleh Prisma sebagai komentar skema.

---

## Lokasi Schema

```
apps/backend/prisma/schema.prisma
```
