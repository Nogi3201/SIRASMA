import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, CalendarCheck, ClipboardCheck, ShieldCheck } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

const highlights = [
  { icon: ClipboardCheck, text: 'Pantau status pengajuan secara real-time' },
  { icon: CalendarCheck, text: 'Ajukan reservasi saat periode dibuka' },
  { icon: ShieldCheck, text: 'Data terkelola aman oleh pengelola asrama' },
];

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => (
  <div className="grid min-h-screen bg-canvas lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
    <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="pointer-events-none absolute -right-24 top-1/3 size-80 rounded-full bg-accent-500/25 blur-3xl" />
      <Link to="/" className="relative flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20"><Building2 className="size-6" /></span>
        <span className="text-2xl font-extrabold tracking-tight">SIRASMA</span>
      </Link>
      <div className="relative">
        <h2 className="text-4xl font-extrabold leading-tight tracking-tight">Reservasi asrama,<br />lebih tertata dari awal.</h2>
        <ul className="mt-8 space-y-4">
          {highlights.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-brand-100"><span className="grid size-9 place-items-center rounded-full bg-white/10"><Icon className="size-4" /></span>{text}</li>
          ))}
        </ul>
      </div>
      <p className="relative text-xs font-semibold uppercase tracking-[.16em] text-brand-200">Universitas Logistik & Bisnis Internasional</p>
    </aside>

    <div className="flex flex-col justify-center px-4 py-10 sm:px-10">
      <div className="mx-auto w-full max-w-xl">
        <Link to="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
          <span className="grid size-10 place-items-center rounded-xl bg-brand-700 text-white"><Building2 className="size-5" /></span>
          <span className="text-xl font-extrabold tracking-tight text-brand-700">SIRASMA</span>
        </Link>
        <div className="animate-fade-up">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
        </div>
        <div className="animate-fade-up mt-6 rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">{children}</div>
        <p className="mt-6 text-center text-xs text-muted">&copy; {new Date().getFullYear()} SIRASMA ULBI. Sistem Informasi Reservasi Asrama.</p>
      </div>
    </div>
  </div>
);
