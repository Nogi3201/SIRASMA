import React, { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useInView, useReducedMotion } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';
import { Card, cx } from './ui.js';

/** Fade/slide in on mount or when scrolled into view. */
export const Rise: React.FC<{ children: React.ReactNode; delay?: number; className?: string; inView?: boolean }> = ({ children, delay = 0, className, inView = false }) => {
  const reduced = useReducedMotion();
  const props = { initial: { opacity: reduced ? 1 : 0, y: reduced ? 0 : 20 }, transition: { duration: reduced ? 0 : 0.5, delay: reduced ? 0 : delay, ease: [0.22, 1, 0.36, 1] as const } };
  return inView
    ? <motion.div className={className} {...props} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }}>{children}</motion.div>
    : <motion.div className={className} {...props} animate={{ opacity: 1, y: 0 }}>{children}</motion.div>;
};

export const CountUp: React.FC<{ value?: number | string | null }> = ({ value }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (typeof value !== 'number' || !seen) return;
    if (reduced) { setN(value); return; }
    const controls = animate(0, value, { duration: 0.9, ease: 'easeOut', onUpdate: (v) => setN(Math.round(v)) });
    return () => controls.stop();
  }, [value, seen, reduced]);
  return <span ref={ref}>{typeof value === 'number' ? n : value ?? '—'}</span>;
};

export const Sparkline: React.FC<{ data: number[]; color?: string; className?: string }> = ({ data, color = '#2d4f9c', className }) => {
  const id = useId().replace(/:/g, '');
  const w = 120, h = 36, max = Math.max(1, ...data), step = w / Math.max(1, data.length - 1);
  const pts = data.map((v, i) => [i * step, h - 4 - (v / max) * (h - 10)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className} aria-hidden="true">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".25" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${line} L${w} ${h} L0 ${h} Z`} fill={`url(#${id})`} />
      <motion.path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: 'easeOut' }} />
    </svg>
  );
};

const tones = { brand: ['bg-brand-50 text-brand-700', '#2d4f9c'], accent: ['bg-accent-50 text-accent-500', '#f15a24'], emerald: ['bg-emerald-50 text-emerald-600', '#059669'], violet: ['bg-violet-50 text-violet-600', '#7c3aed'] } as const;

export const MetricCard: React.FC<{ label: string; value?: number | string | null; icon: React.ElementType; tone?: keyof typeof tones; hint?: string; spark?: number[]; delay?: number }> = ({ label, value, icon: Icon, tone = 'brand', hint, spark, delay = 0 }) => (
  <Rise delay={delay}>
    <Card as="article" className="group relative h-full overflow-hidden p-5 transition duration-300 hover:-translate-y-1 hover:shadow-pop">
      <div className="flex items-start justify-between">
        <span className={cx('grid size-10 place-items-center rounded-full transition duration-300 group-hover:scale-110 group-hover:rotate-6', tones[tone][0])}><Icon className="size-5" /></span>
        {spark && <Sparkline data={spark} color={tones[tone][1]} className="h-9 w-24" />}
      </div>
      <p className="mt-4 text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tracking-tight text-ink"><CountUp value={value} /></p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  </Rise>
);

/** Pill tabs with a sliding highlight (reference 3 style). */
export const Tabs: React.FC<{ id: string; items: { id: string; label: string; count?: number }[]; value: string; onChange: (id: string) => void; className?: string }> = ({ id, items, value, onChange, className }) => (
  <div role="tablist" className={cx('inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-canvas p-1', className)}>
    {items.map((t) => (
      <button key={t.id} type="button" role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)} className={cx('relative cursor-pointer whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors', value === t.id ? 'text-brand-700' : 'text-muted hover:text-ink')}>
        {value === t.id && <motion.span layoutId={`tab-${id}`} className="absolute inset-0 rounded-lg bg-white shadow-sm" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
        <span className="relative flex items-center gap-2">{t.label}{t.count !== undefined && <span className={cx('rounded-full px-1.5 text-xs', value === t.id ? 'bg-brand-50 text-brand-700' : 'bg-white text-muted')}>{t.count}</span>}</span>
      </button>
    ))}
  </div>
);

export const Drawer: React.FC<{ open: boolean; title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }> = ({ open, title, subtitle, onClose, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={title}>
          <motion.button type="button" aria-label="Tutup" onClick={onClose} className="absolute inset-0 bg-brand-900/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.aside className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-white shadow-pop" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 36 }}>
            <div className="flex items-start justify-between gap-4 border-b border-line p-6"><div className="min-w-0"><h2 className="text-lg font-bold text-ink">{title}</h2>{subtitle && <p className="mt-1 truncate font-mono text-xs text-muted">{subtitle}</p>}</div><button type="button" onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-canvas" aria-label="Tutup panel"><X className="size-5" /></button></div>
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};

export const Donut: React.FC<{ segments: { label: string; value: number; color: string }[]; centerLabel: string }> = ({ segments, centerLabel }) => {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = 42, C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="relative mx-auto size-44">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#eef1f6" strokeWidth="11" />
        {segments.map((s, i) => { const len = (s.value / total) * C; const off = acc; acc += len; return <motion.circle key={s.label} cx="50" cy="50" r={r} fill="none" stroke={s.color} strokeWidth="11" strokeLinecap="butt" strokeDashoffset={-off} initial={{ strokeDasharray: `0 ${C}` }} animate={{ strokeDasharray: `${Math.max(0, len - 1.5)} ${C - len + 1.5}` }} transition={{ duration: 0.9, delay: 0.15 * i, ease: 'easeOut' }} />; })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center"><div><p className="text-3xl font-extrabold text-ink"><CountUp value={segments.reduce((s, x) => s + x.value, 0)} /></p><p className="text-xs text-muted">{centerLabel}</p></div></div>
    </div>
  );
};

export const Toast: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => {
  useEffect(() => { const t = window.setTimeout(onClose, 4500); return () => window.clearTimeout(t); }, [message, onClose]);
  return (
    <motion.div role="status" initial={{ opacity: 0, y: -16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16 }} className="fixed right-4 top-24 z-[80] flex max-w-sm items-start gap-3 rounded-2xl border border-emerald-200 bg-white p-4 shadow-pop">
      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" /><p className="text-sm font-semibold text-ink">{message}</p>
      <button type="button" onClick={onClose} className="-m-1 rounded-lg p-1 text-muted hover:bg-canvas" aria-label="Tutup notifikasi"><X className="size-4" /></button>
    </motion.div>
  );
};

/** Maps a reservation status to a step in the journey (or -1 when cancelled). */
export const RESERVATION_STEPS = ['Diajukan', 'Verifikasi', 'Disetujui', 'Selesai'];
export const stepIndex = (status: string) => {
  if (status === 'SUBMITTED') return 0;
  if (status.startsWith('PENDING')) return 1;
  if (status === 'ALLOCATED') return 2;
  if (['CONFIRMED', 'COMPLETED'].includes(status)) return 3;
  return -1;
};
export const Stepper: React.FC<{ status: string; dark?: boolean }> = ({ status, dark }) => {
  const idx = stepIndex(status);
  if (idx < 0) return <p className={cx('text-xs font-semibold', dark ? 'text-red-200' : 'text-red-600')}>Pengajuan dibatalkan / ditolak</p>;
  return (
    <ol className="flex items-center" aria-label="Progres pengajuan">
      {RESERVATION_STEPS.map((label, i) => (
        <li key={label} className={cx('flex items-center', i < RESERVATION_STEPS.length - 1 && 'flex-1')}>
          <div className="flex flex-col items-center gap-1.5">
            <motion.span initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ delay: 0.1 * i, type: 'spring', stiffness: 400, damping: 20 }} className={cx('grid size-7 place-items-center rounded-full text-[11px] font-extrabold', i <= idx ? 'bg-accent-500 text-white' : dark ? 'bg-white/15 text-white/70' : 'bg-canvas text-muted')}>{i < idx ? '✓' : i + 1}</motion.span>
            <span className={cx('text-[10px] font-semibold', i <= idx ? (dark ? 'text-white' : 'text-ink') : dark ? 'text-white/60' : 'text-muted')}>{label}</span>
          </div>
          {i < RESERVATION_STEPS.length - 1 && <span className={cx('mx-1.5 mb-4 h-0.5 flex-1 overflow-hidden rounded-full', dark ? 'bg-white/15' : 'bg-line')}><motion.span initial={{ width: 0 }} animate={{ width: i < idx ? '100%' : '0%' }} transition={{ duration: 0.6, delay: 0.15 * i }} className="block h-full bg-accent-500" /></span>}
        </li>
      ))}
    </ol>
  );
};
