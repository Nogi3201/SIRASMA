import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, ChevronLeft, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext.js';
import { cx } from '../components/ui.js';
import { LogoMark } from '../components/Logo.js';

export type ShellNavItem = { id: string; label: string; icon: React.ElementType; onClick?: () => void; group?: string; badge?: number };

interface AppShellProps { roleLabel: string; title: string; nav: ShellNavItem[]; children: React.ReactNode }

const today = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'long' }).format(new Date());

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

  const displayName = user?.studentProfile?.fullName || user?.email || '';
  const initial = (displayName || '?').charAt(0).toUpperCase();

  const sidebar = (compact: boolean) => (
    <aside className="flex h-full flex-col border-r border-line bg-white">
      <div className="flex h-18 items-center justify-between px-5">
        <div className={cx('flex items-center gap-2.5', compact && 'w-full justify-center')}>
          <LogoMark className="size-9 shrink-0" />
          {!compact && <div><p className="font-extrabold leading-none tracking-tight text-brand-700">SIRASMA</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[.14em] text-accent-500">{roleLabel}</p></div>}
        </div>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-muted hover:bg-canvas lg:hidden" aria-label="Tutup menu"><X className="size-4" /></button>
      </div>
      {!compact && (
        <div className="mx-3 mb-2 flex items-center gap-3 rounded-2xl bg-canvas p-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-700 text-sm font-bold text-white">{initial}</span>
          <div className="min-w-0"><p className="truncate text-sm font-bold text-ink">{displayName}</p><p className="text-xs text-muted">{user?.role}</p></div>
        </div>
      )}
      <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label={`Navigasi ${roleLabel}`}>
        {nav.map((item, i) => {
          const Icon = item.icon; const isActive = active === item.id && !item.onClick;
          const showGroup = !compact && item.group && item.group !== nav[i - 1]?.group;
          return (
            <React.Fragment key={item.id}>
              {showGroup && <p className="mb-1 mt-4 px-3 text-[11px] font-bold uppercase tracking-[.14em] text-slate-400">{item.group}</p>}
              <button type="button" onClick={() => go(item)} title={compact ? item.label : undefined} aria-current={isActive ? 'page' : undefined}
                className={cx('group relative mb-1 flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors', compact && 'justify-center', isActive ? 'text-brand-700' : 'text-muted hover:bg-canvas hover:text-ink')}>
                {isActive && <motion.span layoutId="shell-active" className="absolute inset-0 rounded-xl bg-brand-50" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
                {isActive && !compact && <motion.span layoutId="shell-bar" className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-accent-500" />}
                <Icon className="relative size-[18px] shrink-0 transition group-hover:scale-110" />
                {!compact && <span className="relative flex-1">{item.label}</span>}
                {!compact && item.badge !== undefined && item.badge > 0 && <span className="relative rounded-full bg-accent-500 px-2 py-0.5 text-[11px] font-bold text-white">{item.badge}</span>}
              </button>
            </React.Fragment>
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
      <AnimatePresence>
        {open && <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><button type="button" className="absolute inset-0 bg-brand-900/40" onClick={() => setOpen(false)} aria-label="Tutup menu" /><motion.div className="relative h-full w-72 shadow-pop" initial={{ x: -288 }} animate={{ x: 0 }} exit={{ x: -288 }} transition={{ type: 'spring', stiffness: 340, damping: 34 }}>{sidebar(false)}</motion.div></motion.div>}
      </AnimatePresence>

      <div className={cx('min-h-screen transition-all duration-300', collapsed ? 'lg:pl-20' : 'lg:pl-64')}>
        <header className="sticky top-0 z-30 flex h-18 items-center justify-between border-b border-line bg-white/85 px-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setOpen(true)} className="rounded-lg p-2 text-muted hover:bg-canvas lg:hidden" aria-label="Buka menu"><Menu className="size-5" /></button>
            <button type="button" onClick={() => setCollapsed((v) => !v)} className="hidden rounded-lg p-2 text-muted hover:bg-canvas lg:block" aria-label="Ciutkan sidebar"><ChevronLeft className={cx('size-5 transition-transform', collapsed && 'rotate-180')} /></button>
            <h1 className="text-base font-bold text-ink sm:text-lg">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-muted sm:inline-flex"><CalendarDays className="size-4 text-accent-500" />{today}</span>
            <span className="rounded-full bg-accent-50 px-3 py-1 text-xs font-bold text-accent-600">{user?.role}</span>
            <span className="grid size-9 place-items-center rounded-full bg-brand-700 text-sm font-bold text-white md:hidden">{initial}</span>
          </div>
        </header>
        <main className="mx-auto max-w-7xl space-y-10 p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
};
