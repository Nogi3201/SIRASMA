import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Input } from '../components/Input.js';
import { useAuth } from '../features/auth/AuthContext.js';
import { AuthLayout } from '../layouts/AuthLayout.js';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const role = await login({ email, password });
      // Redirect based on database role
      if (role === 'ADMIN') {
        navigate('/dashboard/admin');
      } else if (role === 'STAFF') {
        navigate('/dashboard/staff');
      } else {
        navigate('/dashboard/student');
      }
    } catch (err: any) {
      setError(err.message || 'Login gagal. Periksa kembali email dan password Anda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Masuk ke Akun Anda" subtitle="Gunakan email dan password terdaftar untuk mengakses SIRASMA">
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email Universitas"
          type="email"
          name="email"
          placeholder="nama@ulbi.ac.id"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div>
          <Input
            label="Password"
            name="password"
            isPassword
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="flex justify-end mt-1.5">
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-brand-700 hover:text-brand-500 transition-colors"
            >
              Lupa password?
            </Link>
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
              Memverifikasi...
            </>
          ) : (
            <>
              Masuk Sekarang
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-slate-100 text-center">
        <p className="text-sm text-slate-600">
          Mahasiswa baru belum memiliki akun?{' '}
          <Link to="/register" className="font-semibold text-brand-700 hover:text-brand-500">
            Daftar di sini
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

