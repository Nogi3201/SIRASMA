import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail, MessageSquare } from 'lucide-react';
import { Input } from '../components/Input.js';
import { AuthLayout } from '../layouts/AuthLayout.js';
import { authService } from '../services/auth.service.js';

export const ForgotPasswordPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [channel, setChannel] = useState<'EMAIL' | 'WHATSAPP'>('EMAIL');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await authService.forgotPassword({ identifier, channel });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Gagal mengirimkan permintaan reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Lupa Password"
      subtitle="Kirim permintaan kode OTP untuk mengatur ulang password akun Anda"
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
          <h3 className="text-base font-bold text-slate-800">Kode Verifikasi Dikirim</h3>
          <p className="mt-2 text-sm text-slate-600">
            Jika akun dengan identitas tersebut terdaftar, kode verifikasi OTP 6-digit telah dikirimkan melalui{' '}
            <span className="font-semibold">{channel}</span>.
          </p>
          <div className="mt-6 flex flex-col space-y-3">
            <Link
              to="/reset-password"
              className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-brand-700 hover:bg-brand-800 shadow-sm"
            >
              Masukkan Kode OTP
            </Link>
            <button
              onClick={() => setSuccess(false)}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Kirim ulang kode
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Email atau Nomor WhatsApp"
            name="identifier"
            placeholder="nama@ulbi.ac.id atau +6281234..."
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
              Saluran Pengiriman OTP
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setChannel('EMAIL')}
                className={`flex items-center justify-center py-2.5 px-3 rounded-xl border text-sm font-medium transition-all ${
                  channel === 'EMAIL'
                    ? 'border-brand-700 bg-brand-50/70 text-brand-800 ring-2 ring-brand-200'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Mail className="w-4 h-4 mr-2" />
                Email
              </button>
              <button
                type="button"
                onClick={() => setChannel('WHATSAPP')}
                className={`flex items-center justify-center py-2.5 px-3 rounded-xl border text-sm font-medium transition-all ${
                  channel === 'WHATSAPP'
                    ? 'border-brand-700 bg-brand-50/70 text-brand-800 ring-2 ring-brand-200'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                WhatsApp
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-brand-700 hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-60 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Memproses Permintaan...
              </>
            ) : (
              'Kirim Kode OTP'
            )}
          </button>

          <div className="pt-2 text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-brand-700"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Kembali ke Login
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};

