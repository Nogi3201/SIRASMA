import React from 'react';
import { LogOut, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext.js';

export const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
            S
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">SIRASMA — Portal Mahasiswa</h1>
            <p className="text-xs text-slate-500">Universitas Logistik & Bisnis Internasional</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-1 rounded-full border border-indigo-200">
            Role: {user?.role}
          </span>
          <button
            onClick={() => logout()}
            className="inline-flex items-center text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xl">
              {user?.studentProfile?.fullName?.charAt(0) || 'M'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Selamat Datang, {user?.studentProfile?.fullName || user?.email}!
              </h2>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-100">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase">NIM</span>
              <p className="text-lg font-bold text-slate-800 mt-1">{user?.studentProfile?.nim || '-'}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase">Program Studi</span>
              <p className="text-sm font-bold text-slate-800 mt-1">{user?.studentProfile?.studyProgram || '-'}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase">Status Verifikasi</span>
              <p className="text-sm font-bold text-amber-600 mt-1 flex items-center">
                <UserCheck className="w-4 h-4 mr-1 text-amber-500" />
                {user?.studentProfile?.academicStatus || 'PENDING'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 text-indigo-900">
          <div className="flex items-start space-x-3">
            <ShieldCheck className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-indigo-950">Autentikasi & Otorisasi Berhasil Aktif (Task 03)</h3>
              <p className="text-sm text-indigo-800 mt-1">
                Akun mahasiswa Anda terproteksi menggunakan JWT access token jangka pendek dan refresh token HttpOnly cookie. Fitur reservasi kamar akan aktif pada tahap berikutnya.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export const StaffDashboard: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
            S
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">SIRASMA — Portal Staff Operasional</h1>
            <p className="text-xs text-slate-500">Pengelolaan Harian Asrama ULBI</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full border border-emerald-200">
            Role: {user?.role}
          </span>
          <button
            onClick={() => logout()}
            className="inline-flex items-center text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900">Halo, Staff {user?.email}</h2>
          <p className="text-sm text-slate-500 mt-1">
            ID Pegawai: {user?.staffProfile?.employeeIdentifier || 'Petugas Asrama'}
          </p>
          <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-600">
            Hak Akses: Memiliki wewenang operasional check-in/out dan verifikasi mahasiswa. Tidak memiliki hak akses ke endpoint khusus Admin.
          </div>
        </div>
      </main>
    </div>
  );
};

export const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold">
            A
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">SIRASMA — Administrator Panel</h1>
            <p className="text-xs text-slate-500">Pengelolaan Sistem Asrama Terpadu</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-xs bg-rose-50 text-rose-700 font-semibold px-2.5 py-1 rounded-full border border-rose-200">
            Role: {user?.role}
          </span>
          <button
            onClick={() => logout()}
            className="inline-flex items-center text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900">Selamat Datang, Administrator</h2>
          <p className="text-sm text-slate-500 mt-1">Email: {user?.email}</p>
          <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-600">
            Hak Akses: Full Access untuk seluruh master data, konfigurasi sistem, dan manajemen akun staf.
          </div>
        </div>
      </main>
    </div>
  );
};

