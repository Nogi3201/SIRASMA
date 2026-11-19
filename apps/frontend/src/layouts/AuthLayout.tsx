import React from 'react';
import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center space-x-3 group">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
            <Building2 className="w-7 h-7" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">SIRASMA</span>
        </Link>
        <p className="mt-1 text-xs uppercase tracking-widest font-semibold text-indigo-400">
          Universitas Logistik & Bisnis Internasional
        </p>
        <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-100">{title}</h2>
        {subtitle && <p className="mt-2 text-sm text-slate-400">{subtitle}</p>}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-white/20">
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} SIRASMA ULBI. Sistem Informasi Reservasi Asrama.
        </p>
      </div>
    </div>
  );
};

