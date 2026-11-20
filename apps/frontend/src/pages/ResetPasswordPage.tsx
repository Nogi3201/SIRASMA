import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, KeyRound, Loader2 } from 'lucide-react';
import { Input } from '../components/Input.js';
import { AuthLayout } from '../layouts/AuthLayout.js';
import { authService } from '../services/auth.service.js';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    identifier: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.newPassword !== form.confirmPassword) {
      setError('Password baru dan konfirmasi tidak cocok.');
      return;
    }

    if (form.newPassword.length < 8) {
      setError('Password baru minimal 8 karakter.');
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/;
    if (!passwordRegex.test(form.newPassword)) {
      setError('Password harus mengandung huruf besar, huruf kecil, angka, dan karakter khusus.');
      return;
    }

    setIsSubmitting(true);

    try {
      await authService.resetPassword(form);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Gagal mereset password. Pastikan kode OTP benar dan belum kedaluwarsa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Atur Ulang Password"
      subtitle="Masukkan kode OTP yang Anda terima beserta password baru"
    >
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {success ? (
        <div className="text-center py-4">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Password Berhasil Diubah!</h3>
          <p className="mt-2 text-sm text-slate-600">
            Seluruh sesi login Anda telah dicabut demi keamanan. Anda akan diarahkan ke halaman login dalam beberapa detik...
          </p>
          <div className="mt-6">
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-700 hover:bg-brand-800"
            >
              Masuk Sekarang
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email atau Nomor WhatsApp Terdaftar"
            name="identifier"
            placeholder="nama@ulbi.ac.id atau +62..."
            value={form.identifier}
            onChange={handleChange}
            required
          />

          <Input
            label="Kode OTP (6 Digit)"
            name="otp"
            placeholder="contoh: 123456"
            value={form.otp}
            onChange={handleChange}
            maxLength={6}
            helperText="Kode verifikasi berlaku selama 15 menit"
            required
          />

          <Input
            label="Password Baru"
            name="newPassword"
            isPassword
            placeholder="Min 8 karakter"
            value={form.newPassword}
            onChange={handleChange}
            helperText="Huruf besar, kecil, angka, simbol"
            required
          />

          <Input
            label="Konfirmasi Password Baru"
            name="confirmPassword"
            isPassword
            placeholder="Ketik ulang password baru"
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 flex items-center justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-brand-700 hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-60 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menyimpan Password Baru...
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4 mr-2" />
                Simpan Password Baru
              </>
            )}
          </button>

          <div className="pt-2 text-center">
            <Link to="/login" className="text-xs font-semibold text-slate-600 hover:text-brand-700">
              Batal dan Kembali ke Login
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};

