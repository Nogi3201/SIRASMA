import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { Input } from '../components/Input.js';
import { useAuth } from '../features/auth/AuthContext.js';
import { AuthLayout } from '../layouts/AuthLayout.js';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();

  const [form, setForm] = useState({
    nim: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    studyProgram: 'D4 Teknik Informatika',
    admissionYear: new Date().getFullYear(),
    activeSemester: 1,
    whatsappNumber: '+62',
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'admissionYear' || name === 'activeSemester' ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validasi frontend
    if (form.password !== form.confirmPassword) {
      setError('Password dan konfirmasi password tidak cocok.');
      return;
    }

    if (form.password.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/;
    if (!passwordRegex.test(form.password)) {
      setError('Password harus mengandung huruf besar, huruf kecil, angka, dan karakter khusus.');
      return;
    }

    if (!/^\+[1-9]\d{7,14}$/.test(form.whatsappNumber.replace(/[\s().-]/g, ''))) {
      setError('Format nomor WhatsApp tidak valid. Gunakan format internasional (contoh: +6281234567890).');
      return;
    }

    setIsSubmitting(true);

    try {
      await register(form);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Registrasi gagal. Periksa kembali kelengkapan data Anda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <AuthLayout title="Registrasi Berhasil" subtitle="Akun mahasiswa SIRASMA Anda telah dibuat">
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Pendaftaran Berhasil!</h3>
          <p className="mt-2 text-sm text-slate-600">
            Akun mahasiswa Anda dengan NIM <span className="font-semibold text-slate-900">{form.nim}</span> telah aktif.
            Status verifikasi akademik Anda saat ini adalah <span className="text-amber-600 font-semibold">PENDING</span> dan akan ditinjau oleh petugas asrama.
          </p>
          <div className="mt-8">
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-colors"
            >
              Lanjut ke Halaman Login
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Pendaftaran Mahasiswa"
      subtitle="Isi data akademik resmi untuk mengajukan akun reservasi asrama"
    >
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nomor Induk Mahasiswa (NIM)"
            name="nim"
            placeholder="contoh: 1214001"
            value={form.nim}
            onChange={handleChange}
            required
          />
          <Input
            label="Nama Lengkap"
            name="fullName"
            placeholder="sesuai KTM/KTP"
            value={form.fullName}
            onChange={handleChange}
            required
          />
        </div>

        <Input
          label="Email Resmi (Kampus/Pribadi)"
          type="email"
          name="email"
          placeholder="nama@ulbi.ac.id"
          value={form.email}
          onChange={handleChange}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Password"
            name="password"
            isPassword
            placeholder="Min 8 karakter"
            value={form.password}
            onChange={handleChange}
            helperText="Besar, kecil, angka, simbol"
            required
          />
          <Input
            label="Konfirmasi Password"
            name="confirmPassword"
            isPassword
            placeholder="Ketik ulang password"
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
            Program Studi
          </label>
          <select
            name="studyProgram"
            value={form.studyProgram}
            onChange={handleChange}
            className="block w-full rounded-lg border border-slate-300 text-sm px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 bg-white"
          >
            <option value="D4 Teknik Informatika">D4 Teknik Informatika</option>
            <option value="D3 Manajemen Logistik">D3 Manajemen Logistik</option>
            <option value="S1 Bisnis Digital">S1 Bisnis Digital</option>
            <option value="S1 Sains Data">S1 Sains Data</option>
            <option value="D4 Akuntansi Keuangan">D4 Akuntansi Keuangan</option>
            <option value="D3 Akuntansi">D3 Akuntansi</option>
            <option value="S1 Manajemen Rekayasa">S1 Manajemen Rekayasa</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Tahun Masuk (Angkatan)"
            type="number"
            name="admissionYear"
            value={form.admissionYear}
            onChange={handleChange}
            min={2000}
            max={2030}
            required
          />
          <Input
            label="Semester Aktif"
            type="number"
            name="activeSemester"
            value={form.activeSemester}
            onChange={handleChange}
            min={1}
            max={14}
            required
          />
        </div>

        <Input
          label="Nomor WhatsApp (Aktif)"
          name="whatsappNumber"
          placeholder="+6281234567890"
          value={form.whatsappNumber}
          onChange={handleChange}
          helperText="Format internasional (+62...)"
          required
        />

        <div className="pt-2">
          <div className="flex items-center text-xs text-slate-500 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <ShieldCheck className="w-5 h-5 text-indigo-600 mr-2 flex-shrink-0" />
            <span>Role mahasiswa ditetapkan otomatis oleh sistem. Status verifikasi akademik akan dimulai dari status PENDING.</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Mendaftarkan Akun...
              </>
            ) : (
              'Daftar Sebagai Mahasiswa'
            )}
          </button>
        </div>
      </form>

      <div className="mt-6 pt-6 border-t border-slate-100 text-center">
        <p className="text-sm text-slate-600">
          Sudah memiliki akun?{' '}
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Masuk di sini
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

