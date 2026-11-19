import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext.js';

export const UnauthorizedPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white/95 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/10 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">403 — Akses Ditolak</h1>
        <p className="mt-2 text-sm text-slate-600">
          Anda masuk sebagai <span className="font-semibold text-indigo-700">{user?.role || 'Guest'}</span> ({user?.email}). Akun Anda tidak memiliki hak akses untuk membuka halaman ini.
        </p>

        <div className="mt-6 p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 text-left">
          <p className="font-semibold mb-1">Batasan Role SIRASMA:</p>
          <ul className="list-disc list-inside space-y-0.5 text-amber-700">
            <li>USER: Reservasi kamar, data pribadi mahasiswa.</li>
            <li>STAFF: Operasional asrama, verifikasi check-in/out.</li>
            <li>ADMIN: Pengelolaan master data dan konfigurasi sistem.</li>
          </ul>
        </div>

        <div className="mt-8 flex justify-center space-x-3">
          <Link
            to={
              user?.role === 'ADMIN'
                ? '/dashboard/admin'
                : user?.role === 'STAFF'
                ? '/dashboard/staff'
                : '/dashboard/student'
            }
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Dashboard Saya
          </Link>
        </div>
      </div>
    </div>
  );
};

