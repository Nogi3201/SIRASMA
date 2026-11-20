import React, { useEffect, useState } from 'react';
import { Bell, ChevronLeft, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext.js';
import { cx } from '../components/ui.js';
import { LogoMark } from '../components/Logo.js';

export type ShellNavItem = { id: string; label: string; icon: React.ElementType; onClick?: () => void };

interface AppShellProps {
  roleLabel: string;
  title: string;
  nav: ShellNavItem[];
  children: React.ReactNode;
}

/** Sidebar + topbar layout shared by ADMIN, STAFF and USER dashboards. */
export const AppShell: React.FC<AppShellProps> = ({ roleLabel, title, nav, children }) => {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [active, setActive] = useState(nav[0]?.id);

  useEffect(() => {
    const targets = nav.filter((n) => !n.onClick).map((n) => document.getElementById(n.id)).filter(Boolean) as HTMLElement[];
    if (!targets.length) return;
    const observer = new IntersectionObserver((entries) => {
      const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (hit) setActive(hit.target.id);
    }, { rootMargin: '-15% 0px -70% 0px' });
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [nav]);

  const go = (item: ShellNavItem) => {
    setOpen(false);
    if (item.onClick) return item.onClick();
    setActive(item.id);
    document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const initial = (user?.studentProfile?.fullName || user?.email || '?').charAt(0).toUpperCase();
  const displayName = user?.studentProfile?.fullName || user?.email;

  const sidebar = (compact: boolean) => (
    <aside className="flex h-full flex-col border-r border-line bg-white">
      <div className="flex h-18 items-center justify-between px-5">
        <div className={cx('flex items-center gap-2.5', compact && 'justify-center')}>
          <LogoMark className="size-9 shrink-0" />
          {!compact && <div><p className="font-extrabold leading-none tracking-tight text-brand-700">SIRASMA</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[.14em] text-accent-500">{roleLabel}</p></div>}
        </div>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-muted hover:bg-canvas lg:hidden" aria-label="Tutup menu"><X className="size-4" /></button>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2" aria-label={`Navigasi ${roleLabel}`}>
        {nav.map((item) => {
          const Icon = item.icon; const isActive = active === item.id && !item.onClick;
          return (
            <button key={item.id} type="button" onClick={() => go(item)} title={compact ? item.label : undefined} aria-current={isActive ? 'page' : undefined}
              className={cx('flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition', compact && 'justify-center', isActive ? 'bg-brand-50 text-brand-700' : 'text-muted hover:bg-canvas hover:text-ink')}>
              <Icon className="size-[18px] shrink-0" />{!compact && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>
      <div className="border-t border-line p-3">
        <button type="button" onClick={() => void logout()} title={compact ? 'Keluar' : undefined} className={cx('flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50', compact && 'justify-center')}>
          <LogOut className="size-[18px] shrink-0" />{!compact && 'Keluar'}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-canvas">
      <div className={cx('fixed inset-y-0 left-0 z-40 hidden transition-all duration-300 lg:block', collapsed ? 'w-20' : 'w-64')}>{sidebar(collapsed)}</div>
      {open && <div className="fixed inset-0 z-50 lg:hidden"><button type="button" className="animate-fade-in absolute inset-0 bg-brand-900/40" onClick={() => setOpen(false)} aria-label="Tutup menu" /><div className="animate-fade-in relative h-full w-72 shadow-pop">{sidebar(false)}</div></div>}

      <div className={cx('min-h-screen transition-all duration-300', collapsed ? 'lg:pl-20' : 'lg:pl-64')}>
        <header className="sticky top-0 z-30 flex h-18 items-center justify-between border-b border-line bg-white/85 px-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setOpen(true)} className="rounded-lg p-2 text-muted hover:bg-canvas lg:hidden" aria-label="Buka menu"><Menu className="size-5" /></button>
            <button type="button" onClick={() => setCollapsed((v) => !v)} className="hidden rounded-lg p-2 text-muted hover:bg-canvas lg:block" aria-label="Ciutkan sidebar"><ChevronLeft className={cx('size-5 transition-transform', collapsed && 'rotate-180')} /></button>
            <h1 className="text-base font-bold text-ink sm:text-lg">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-accent-50 px-3 py-1 text-xs font-bold text-accent-600 sm:inline">{user?.role}</span>
            <button type="button" className="grid size-9 place-items-center rounded-full text-muted hover:bg-canvas" aria-label="Notifikasi"><Bell className="size-[18px]" /></button>
            <div className="flex items-center gap-2.5 border-l border-line pl-3">
              <span className="grid size-9 place-items-center rounded-full bg-brand-700 text-sm font-bold text-white">{initial}</span>
              <p className="hidden max-w-44 truncate text-sm font-semibold text-ink md:block">{displayName}</p>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl space-y-8 p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
};
