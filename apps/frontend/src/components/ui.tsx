import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

/* ── Form field classes (shared by all forms) ── */
export const fieldClass =
  'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100';

/* ── Button ── */
type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger' | 'success';
const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-700 text-white shadow-sm hover:bg-brand-800',
  accent: 'bg-accent-500 text-white shadow-sm hover:bg-accent-600',
  secondary: 'border border-line bg-white text-ink hover:bg-canvas',
  ghost: 'text-brand-700 hover:bg-brand-50',
  danger: 'border border-red-200 bg-white text-red-600 hover:bg-red-50',
  success: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700',
};
export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md'; loading?: boolean }> = ({
  variant = 'primary', size = 'md', loading, className, children, disabled, type = 'button', ...props
}) => (
  <button
    type={type}
    disabled={disabled || loading}
    className={cx(
      'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50',
      size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm',
      buttonVariants[variant], className,
    )}
    {...props}
  >
    {loading && <Loader2 className="size-4 animate-spin" />}
    {children}
  </button>
);

/* ── Card ── */
export const Card: React.FC<React.HTMLAttributes<HTMLElement> & { as?: 'section' | 'article' | 'div' }> = ({ as: Tag = 'section', className, ...props }) => (
  <Tag className={cx('rounded-2xl border border-line bg-white shadow-card', className)} {...props} />
);

export const SectionHeader: React.FC<{ title: string; description?: string; action?: React.ReactNode }> = ({ title, description, action }) => (
  <div className="flex flex-wrap items-end justify-between gap-3">
    <div>
      <h2 className="text-lg font-bold tracking-tight text-ink">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
    </div>
    {action}
  </div>
);

/* ── Stat card ── */
export const StatCard: React.FC<{ label: string; value: React.ReactNode; icon: React.ElementType; tone?: 'brand' | 'accent' | 'emerald' | 'violet'; hint?: string }> = ({ label, value, icon: Icon, tone = 'brand', hint }) => {
  const tones = { brand: 'bg-brand-50 text-brand-700', accent: 'bg-accent-50 text-accent-500', emerald: 'bg-emerald-50 text-emerald-600', violet: 'bg-violet-50 text-violet-600' };
  return (
    <Card as="article" className="animate-fade-up p-5 transition hover:-translate-y-0.5 hover:shadow-pop">
      <span className={cx('grid size-10 place-items-center rounded-full', tones[tone])}><Icon className="size-5" /></span>
      <p className="mt-4 text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tracking-tight text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
};

/* ── Status badge ── */
const statusTone = (status: string) => {
  if (['ALLOCATED', 'CONFIRMED', 'COMPLETED', 'AVAILABLE', 'APPROVED', 'Aktif'].includes(status)) return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
  if (['CANCELLED', 'REJECTED', 'Nonaktif'].includes(status)) return 'bg-red-50 text-red-600 ring-red-100';
  if (status.startsWith('PENDING') || status === 'SUBMITTED') return 'bg-accent-50 text-accent-600 ring-accent-100';
  return 'bg-brand-50 text-brand-700 ring-brand-100';
};
export const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1', statusTone(status))}>
    <span className="size-1.5 rounded-full bg-current" />{status.replaceAll('_', ' ')}
  </span>
);

/* ── Feedback ── */
export const Alert: React.FC<{ tone: 'error' | 'success'; children: React.ReactNode }> = ({ tone, children }) => (
  <div role={tone === 'error' ? 'alert' : 'status'} className={cx('animate-fade-in flex items-start gap-2 rounded-xl border p-3.5 text-sm font-medium', tone === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
    {tone === 'error' ? <AlertCircle className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}<span>{children}</span>
  </div>
);

export const Spinner: React.FC<{ label?: string }> = ({ label = 'Memuat…' }) => (
  <div className="grid min-h-48 place-items-center text-sm text-muted"><div className="flex flex-col items-center gap-2"><Loader2 className="size-5 animate-spin text-brand-700" />{label}</div></div>
);

export const EmptyState: React.FC<{ icon: React.ElementType; title: string; description?: string; action?: React.ReactNode }> = ({ icon: Icon, title, description, action }) => (
  <div className="grid min-h-48 place-items-center px-5 py-8 text-center">
    <div className="flex flex-col items-center">
      <span className="grid size-12 place-items-center rounded-full bg-canvas text-slate-400"><Icon className="size-6" /></span>
      <p className="mt-3 font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  </div>
);

/* ── Modal ── */
export const Modal: React.FC<{ title: string; description?: string; onClose: () => void; children: React.ReactNode; size?: 'md' | 'lg' | 'xl' | '2xl'; labelledBy?: string }> = ({ title, description, onClose, children, size = 'md', labelledBy = 'modal-title' }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const sizeClass = size === '2xl' ? 'max-w-5xl' : size === 'xl' ? 'max-w-4xl' : size === 'lg' ? 'max-w-2xl' : 'max-w-md';
  return (
    <div className="animate-fade-in fixed inset-0 z-[70] grid place-items-center bg-brand-900/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby={labelledBy} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={cx('animate-pop-in max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-pop', sizeClass)}>
        <div className="flex items-start justify-between gap-4">
          <div><h2 id={labelledBy} className="text-lg font-bold text-ink">{title}</h2>{description && <p className="mt-1 text-sm text-muted">{description}</p>}</div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-canvas" aria-label="Tutup"><X className="size-5" /></button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
};

/* ── Table + pagination ── */
export const Th: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ className, ...p }) => <th className={cx('px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted', className)} {...p} />;
export const Td: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ className, ...p }) => <td className={cx('px-5 py-4 text-sm', className)} {...p} />;

export const Pagination: React.FC<{ page: number; pageCount: number; total: number; onChange: (p: number) => void }> = ({ page, pageCount, total, onChange }) => (
  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3 text-sm text-muted">
    <span>{total} hasil · halaman {page} dari {pageCount}</span>
    <div className="flex gap-2">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft className="size-4" />Sebelumnya</Button>
      <Button variant="secondary" size="sm" disabled={page >= pageCount} onClick={() => onChange(page + 1)}>Berikutnya<ChevronRight className="size-4" /></Button>
    </div>
  </div>
);

/* ── Form label wrapper ── */
export const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block text-sm font-semibold text-ink"><span className="mb-1.5 block">{label}</span>{children}</label>
);

export const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
