# User Roles — SIRASMA

## Gambaran Umum

SIRASMA menggunakan sistem RBAC (Role-Based Access Control) dengan tiga peran utama.

---

## Peran dan Hak Akses

### 1. ADMIN

**Deskripsi:** Administrator sistem dengan akses penuh ke seluruh fitur dan konfigurasi.

| Kapabilitas | Detail |
|---|---|
| Manajemen pengguna | Buat, ubah, nonaktifkan akun (staff & user) |
| Manajemen kamar | CRUD gedung, lantai, kamar, tipe kamar |
| Manajemen reservasi | Lihat, setujui, tolak, batalkan semua reservasi |
| Manajemen pembayaran | Konfirmasi, tolak, verifikasi pembayaran |
| Laporan | Akses semua laporan dan data statistik |
| Pengumuman | Buat, ubah, hapus pengumuman |
| Konfigurasi sistem | Atur parameter, tarif, periode penerimaan |

**Catatan:** Akun ADMIN dibuat secara manual oleh developer/DBA. Tidak tersedia registrasi mandiri untuk ADMIN.

---

### 2. STAFF

**Deskripsi:** Petugas operasional asrama yang mengelola aktivitas harian.

| Kapabilitas | Detail |
|---|---|
| Lihat pengguna | Hanya baca data penghuni |
| Manajemen kamar | Lihat status kamar, update kebersihan/kondisi |
| Manajemen reservasi | Proses reservasi (setujui/tolak), check-in, check-out |
| Manajemen pembayaran | Konfirmasi pembayaran, cetak kwitansi |
| Laporan | Laporan harian/mingguan hunian |
| Pengumuman | Buat dan kelola pengumuman untuk penghuni |

**Catatan:** Akun STAFF dibuat oleh ADMIN. STAFF tidak dapat mengubah konfigurasi sistem atau mengelola akun ADMIN lain.

---

### 3. USER (Mahasiswa)

**Deskripsi:** Mahasiswa ULBI yang menggunakan sistem untuk reservasi kamar asrama.

| Kapabilitas | Detail |
|---|---|
| Registrasi & login | Daftar akun dengan data mahasiswa |
| Lihat kamar | Telusuri kamar yang tersedia |
| Reservasi | Ajukan reservasi kamar |
| Status reservasi | Pantau status pengajuan reservasi |
| Pembayaran | Upload bukti pembayaran |
| Profil | Kelola data profil sendiri |
| Pengumuman | Lihat pengumuman dari admin/staff |

**Catatan:** USER hanya dapat mengakses dan mengubah data miliknya sendiri. Tidak ada akses ke data pengguna lain.

---

## Matriks Akses (Ringkasan)

| Fitur | ADMIN | STAFF | USER |
|---|:---:|:---:|:---:|
| Manajemen akun pengguna | ✅ Full | ❌ | ❌ |
| Manajemen kamar | ✅ Full | 👁️ View + Update kondisi | 👁️ View tersedia |
| Reservasi (semua) | ✅ Full | ✅ Proses | ❌ |
| Reservasi (milik sendiri) | ✅ | ✅ | ✅ |
| Konfirmasi pembayaran | ✅ | ✅ | ❌ |
| Upload bukti bayar | ✅ | ✅ | ✅ Milik sendiri |
| Laporan | ✅ Semua | ✅ Terbatas | ❌ |
| Pengumuman (kelola) | ✅ | ✅ | ❌ |
| Pengumuman (lihat) | ✅ | ✅ | ✅ |
| Konfigurasi sistem | ✅ | ❌ | ❌ |

---

## Implementasi Teknis

- Role disimpan sebagai enum di tabel `User` pada database.
- Validasi role dilakukan di layer backend (NestJS Guard).
- Frontend menyesuaikan UI berdasarkan role yang diterima dari API.

```prisma
// Contoh (akan didefinisikan di Task 02)
enum Role {
  ADMIN
  STAFF
  USER
}
```

