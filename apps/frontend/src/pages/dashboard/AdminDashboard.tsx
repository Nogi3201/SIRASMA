import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  BarChart3,
  BedDouble,
  Building2,
  CalendarClock,
  ClipboardList,
  LayoutDashboard,
  Library,
  RefreshCw,
  Search,
  UserCheck,
  UserPlus,
  UsersRound,
  Wallet,
} from 'lucide-react';
import { dashboardService, type AdminDashboardData } from '../../services/dashboard.service.js';
import { managementService } from '../../services/management.service.js';
import { authAdminService } from '../../services/auth-admin.service.js';
import { paymentsService, type Invoice, type PaymentSummary } from '../../services/payments.service.js';
import { AppShell, type ShellNavItem } from '../../layouts/AppShell.js';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Field,
  SectionHeader,
  Spinner,
  StatusBadge,
  cx,
  fieldClass,
} from '../../components/ui.js';
import { Donut, MetricCard, Rise, Tabs } from '../../components/motion.js';
import { CatalogManagementModal, type Catalog } from './CatalogManagementModal.js';

type DashboardDataState = 'loading' | 'empty' | 'error' | 'ready';
const STATUS_COLORS = ['#203b78', '#f15a24', '#059669', '#7c3aed', '#3f64b5', '#e11d48'];

const AdminManagementPanel: React.FC = () => {
  const [staff, setStaff] = useState<
    {
      id: string;
      email: string;
      is_active: boolean;
      staff_profiles?: { employee_identifier?: string | null } | null;
    }[]
  >([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    employeeIdentifier: '',
    phoneNumber: '',
  });

  const load = async () => {
    try {
      setStaff(await managementService.staffs());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Daftar STAFF tidak dapat dimuat.');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await authAdminService.createStaff(form);
      setForm({ fullName: '', email: '', password: '', employeeIdentifier: '', phoneNumber: '' });
      setSuccess('Akun STAFF berhasil dibuat.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Akun STAFF gagal dibuat.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <Card as="article" className="p-6 xl:col-span-3">
        <h3 className="flex items-center gap-2 font-bold text-ink">
          <UserPlus className="size-5 text-brand-700" />
          Tambah akun STAFF
        </h3>
        <p className="mt-1 text-sm text-muted">
          Akun baru yang dibuat akan langsung memiliki hak akses operasional STAFF.
        </p>
        <div className="mt-4 space-y-3">
          {error && <Alert tone="error">{error}</Alert>}
          {success && <Alert tone="success">{success}</Alert>}
        </div>
        <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          {[
            ['fullName', 'Nama lengkap *'],
            ['email', 'Email institusi *'],
            ['employeeIdentifier', 'ID Pegawai / NIP'],
            ['phoneNumber', 'Nomor WhatsApp / Telepon'],
          ].map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                required={key === 'fullName' || key === 'email'}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={key === 'email' ? 'staff@ulbi.ac.id' : ''}
                className={fieldClass}
              />
            </Field>
          ))}
          <div className="sm:col-span-2">
            <Field label="Password Akun (Minimal 8 karakter) *">
              <input
                required
                type="password"
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className={fieldClass}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" loading={saving}>
              {saving ? 'Menyimpan…' : 'Buat Akun STAFF'}
            </Button>
          </div>
        </form>
      </Card>

      <Card as="article" className="p-6 xl:col-span-2">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-ink">
            Daftar Petugas STAFF{' '}
            <span className="ml-1 text-sm font-medium text-muted">({staff.length})</span>
          </h3>
          <Button variant="ghost" size="sm" onClick={() => void load()}>
            Segarkan
          </Button>
        </div>
        <div className="mt-4 max-h-[360px] divide-y divide-line overflow-y-auto pr-1">
          {staff.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Belum ada akun STAFF terdaftar.</p>
          ) : (
            staff.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 py-3"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                  {item.email.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{item.email}</p>
                  <p className="text-xs text-muted">
                    {item.staff_profiles?.employee_identifier
                      ? `ID: ${item.staff_profiles.employee_identifier}`
                      : 'Tanpa ID pegawai'}
                  </p>
                </div>
                <StatusBadge status={item.is_active ? 'Aktif' : 'Nonaktif'} />
              </motion.div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

/** Building cards with room availability and quick access to catalog management */
const BuildingCards: React.FC<{ catalog: Catalog; onManage: () => void }> = ({
  catalog,
  onManage,
}) => (
  <div className="space-y-4">
    <Rise inView>
      <SectionHeader
        title="Gedung asrama"
        description="Ringkasan kapasitas, kamar, dan ketersediaan di setiap gedung asrama."
        action={
          <Button variant="primary" onClick={onManage} className="shadow-sm">
            <Building2 className="size-4" />
            Buka Pengelolaan Katalog
          </Button>
        }
      />
    </Rise>
    {catalog.buildings.length === 0 ? (
      <Card>
        <EmptyState
          icon={Building2}
          title="Belum ada gedung asrama"
          description="Tambahkan gedung pertama untuk mulai mengonfigurasi kamar dan kapasitas asrama."
          action={
            <Button variant="primary" size="sm" onClick={onManage}>
              <Building2 className="size-4" />
              Kelola Katalog
            </Button>
          }
        />
      </Card>
    ) : (
      <div className="grid gap-5 lg:grid-cols-2">
        {catalog.buildings.map((b, i) => {
          const rooms = catalog.rooms.filter((r) => r.buildings?.id === b.id);
          const capacity = rooms.reduce((s, r) => s + r.capacity, 0);
          const available = rooms.filter((r) => r.status === 'AVAILABLE').length;
          const byStatus = Object.entries(
            rooms.reduce<Record<string, number>>(
              (acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }),
              {}
            )
          );
          const pct = rooms.length ? Math.round((available / rooms.length) * 100) : 0;
          return (
            <Rise key={b.id} inView delay={i * 0.05}>
              <Card
                as="article"
                className="group flex h-full gap-5 p-5 transition duration-300 hover:-translate-y-1 hover:shadow-pop"
              >
                <div className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 text-white sm:size-28">
                  <Building2 className="size-10 transition duration-500 group-hover:scale-125" />
                  <span className="absolute -bottom-6 -right-6 size-16 rounded-full bg-accent-500/40" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-bold text-ink">{b.name}</h3>
                      <p className="text-sm text-muted">
                        Peruntukan: {b.gender_policy.replaceAll('_', ' ')}
                      </p>
                    </div>
                    <StatusBadge status={b.is_active ? 'Aktif' : 'Nonaktif'} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink">
                    <span className="flex items-center gap-1.5">
                      <BedDouble className="size-4 text-brand-500" />
                      {rooms.length || b._count?.rooms || 0} kamar
                    </span>
                    <span className="flex items-center gap-1.5">
                      <UsersRound className="size-4 text-brand-500" />
                      Kapasitas {capacity}
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-muted">
                      <span>Kamar tersedia</span>
                      <span className="font-bold text-ink">
                        {available}/{rooms.length}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-canvas">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${pct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-brand-700 to-accent-500"
                      />
                    </div>
                  </div>
                  {byStatus.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {byStatus.map(([s, n]) => (
                        <span
                          key={s}
                          className="rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-muted"
                        >
                          {s.replaceAll('_', ' ')}: {n}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </Rise>
          );
        })}
      </div>
    )}
  </div>
);

export const AdminDashboard: React.FC = () => {
  const [dataState, setDataState] = useState<DashboardDataState>('loading');
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [catalog, setCatalog] = useState<Catalog>({
    buildings: [],
    facilities: [],
    rooms: [],
    periods: [],
  });
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [syncingInvoiceId, setSyncingInvoiceId] = useState<string | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [tab, setTab] = useState('ALL');
  const [search, setSearch] = useState('');

  const loadCatalog = useCallback(async () => {
    try {
      const [buildings, facilities, rooms, periods] = await Promise.all([
        managementService.buildings(),
        managementService.facilities(),
        managementService.rooms(),
        managementService.periods(),
      ]);
      setCatalog({ buildings, facilities, rooms, periods });
    } catch {
      /* katalog gagal dimuat */
    }
  }, []);

  const loadDashboard = async () => {
    setDataState('loading');
    try {
      const [response, invList, summary] = await Promise.all([
        dashboardService.admin(),
        paymentsService.adminList(),
        paymentsService.adminSummary(),
      ]);
      setDashboard(response.data);
      setInvoices(invList);
      setPaymentSummary(summary);
      setDataState(response.data.recentReservations.length ? 'ready' : 'empty');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Data dashboard tidak dapat dimuat.');
      setDataState('error');
    }
  };

  useEffect(() => {
    void loadDashboard();
    void loadCatalog();
  }, [loadCatalog]);

  const handleSyncInvoice = async (invoiceId: string) => {
    setSyncingInvoiceId(invoiceId);
    try {
      await paymentsService.syncInvoice(invoiceId);
      await loadDashboard();
    } catch {
      /* ignore */
    } finally {
      setSyncingInvoiceId(null);
    }
  };

  const loading = dataState === 'loading';
  const activePeriod = catalog.periods.find((p) => p.is_active);
  const recent = dashboard?.recentReservations ?? [];
  const statusTabs = useMemo(
    () => [
      { id: 'ALL', label: 'Semua', count: recent.length },
      ...[...new Set(recent.map((r) => r.status))].map((s) => ({
        id: s,
        label: s.replaceAll('_', ' '),
        count: recent.filter((r) => r.status === s).length,
      })),
    ],
    [recent]
  );
  const filtered = recent.filter(
    (r) =>
      (tab === 'ALL' || r.status === tab) &&
      `${r.student.name} ${r.student.nim}`.toLowerCase().includes(search.trim().toLowerCase())
  );
  const segments = (dashboard?.statusSummary ?? []).map((s, i) => ({
    label: s.status.replaceAll('_', ' '),
    value: s.count,
    color: STATUS_COLORS[i % STATUS_COLORS.length],
  }));

  const filteredInvoices = useMemo(() => {
    const q = paymentSearch.trim().toLowerCase();
    return invoices.filter((inv) => {
      const matchStatus = paymentStatusFilter === 'ALL' || inv.status === paymentStatusFilter;
      const studentName = inv.reservations?.student_profiles?.full_name?.toLowerCase() ?? '';
      const nim = inv.reservations?.student_profiles?.nim?.toLowerCase() ?? '';
      const invNo = inv.invoice_number.toLowerCase();
      const matchSearch = !q || studentName.includes(q) || nim.includes(q) || invNo.includes(q);
      return matchStatus && matchSearch;
    });
  }, [invoices, paymentSearch, paymentStatusFilter]);

  const nav: ShellNavItem[] = [
    { id: 'ringkasan', label: 'Ringkasan', icon: LayoutDashboard, group: 'Monitoring' },
    { id: 'reservasi', label: 'Reservasi Terbaru', icon: BarChart3, group: 'Monitoring' },
    {
      id: 'pembayaran',
      label: 'Data Pembayaran',
      icon: Wallet,
      group: 'Monitoring',
      badge: invoices.filter((i) => i.status === 'ISSUED').length,
    },
    { id: 'gedung', label: 'Gedung Asrama', icon: Building2, group: 'Pengelolaan' },
    { id: 'staff', label: 'Akun Staff', icon: UserPlus, group: 'Pengelolaan' },
    {
      id: 'katalog',
      label: 'Kelola Katalog',
      icon: Library,
      group: 'Pengelolaan',
      onClick: () => setCatalogOpen(true),
    },
  ];

  return (
    <AppShell roleLabel="Administrator" title="Dashboard Admin" nav={nav}>
      {/* 1. Ringkasan Sistem */}
      <section id="ringkasan" className="scroll-mt-24 space-y-6">
        <Rise>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-ink">Ringkasan sistem</h2>
              <p className="mt-1 text-sm text-muted">
                Gambaran data operasional dan infrastruktur asrama dalam satu tempat.
              </p>
            </div>
            {activePeriod && (
              <div className="flex items-center gap-3 rounded-2xl border border-accent-100 bg-accent-50 px-4 py-3">
                <CalendarClock className="size-5 text-accent-500" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent-600">
                    Periode aktif
                  </p>
                  <p className="text-sm font-bold text-ink">{activePeriod.name}</p>
                </div>
              </div>
            )}
          </div>
        </Rise>
        <div aria-label="Statistik sistem" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Total mahasiswa"
            icon={UsersRound}
            tone="brand"
            value={loading ? '—' : dashboard?.totals.students}
            delay={0}
          />
          <MetricCard
            label="Total staff"
            icon={UserCheck}
            tone="violet"
            value={loading ? '—' : dashboard?.totals.staff}
            delay={0.06}
          />
          <MetricCard
            label="Gedung asrama"
            icon={Building2}
            tone="emerald"
            value={loading ? '—' : dashboard?.totals.buildings}
            delay={0.12}
          />
          <MetricCard
            label="Total kamar"
            icon={BedDouble}
            tone="accent"
            value={loading ? '—' : dashboard?.totals.rooms}
            delay={0.18}
          />
          <MetricCard
            label="Total reservasi"
            icon={ClipboardList}
            tone="brand"
            value={loading ? '—' : dashboard?.totals.reservations}
            delay={0.24}
          />
        </div>

        <div aria-label="Statistik keuangan asrama" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total penerimaan lunas"
            icon={Wallet}
            tone="emerald"
            value={loading ? '—' : `Rp ${(paymentSummary?.totalPaidAmount ?? 0).toLocaleString('id-ID')}`}
            delay={0.3}
          />
          <MetricCard
            label="Tagihan lunas"
            icon={ClipboardList}
            tone="brand"
            value={loading ? '—' : (paymentSummary?.paidInvoices ?? 0)}
            delay={0.36}
          />
          <MetricCard
            label="Menunggu pembayaran"
            icon={CalendarClock}
            tone="accent"
            value={loading ? '—' : (paymentSummary?.pendingInvoices ?? 0)}
            delay={0.42}
          />
          <MetricCard
            label="Total invoice diterbitkan"
            icon={BarChart3}
            tone="violet"
            value={loading ? '—' : (paymentSummary?.totalInvoices ?? invoices.length)}
            delay={0.48}
          />
        </div>
      </section>

      {/* 2. Reservasi Terbaru & Ringkasan Status */}
      <section id="reservasi" className="scroll-mt-24 grid gap-6 xl:grid-cols-3">
        <Rise inView className="xl:col-span-2">
          <Card className="h-full">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <h3 className="font-bold text-ink">Reservasi terbaru</h3>
                <p className="mt-0.5 text-sm text-muted">Pengajuan terbaru dari mahasiswa.</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  void loadDashboard();
                  void loadCatalog();
                }}
                disabled={loading}
              >
                <RefreshCw className={cx('size-4', loading && 'animate-spin')} />
                Muat ulang
              </Button>
            </div>
            {dataState === 'ready' && (
              <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
                <Tabs id="admin-res" items={statusTabs} value={tab} onChange={setTab} />
                <div className="relative ml-auto min-w-48 flex-1 sm:max-w-56">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                  <input
                    aria-label="Cari reservasi"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nama / NIM"
                    className={cx(fieldClass, 'py-2 pl-9')}
                  />
                </div>
              </div>
            )}
            {loading ? (
              <Spinner label="Memuat ringkasan reservasi…" />
            ) : dataState === 'error' ? (
              <EmptyState
                icon={AlertCircle}
                title="Ringkasan belum dapat dimuat"
                description={loadError}
                action={
                  <Button variant="ghost" size="sm" onClick={() => void loadDashboard()}>
                    Coba lagi
                  </Button>
                }
              />
            ) : dataState === 'empty' ? (
              <EmptyState
                icon={ClipboardList}
                title="Belum ada reservasi terbaru"
                description="Data akan tampil ketika pengajuan tersedia."
              />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Search}
                title="Tidak ada hasil"
                description="Ubah filter atau kata kunci pencarian."
              />
            ) : (
              <ul className="divide-y divide-line">
                {filtered.map((r, i) => (
                  <motion.li
                    key={r.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-brand-50/40"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                        {r.student.name.charAt(0)}
                      </span>
                      <div>
                        <p className="font-semibold text-ink">
                          {r.student.name}{' '}
                          <span className="font-normal text-muted">({r.student.nim})</span>
                        </p>
                        <p className="mt-0.5 text-sm text-muted">
                          {r.room ? `${r.room.building} · Kamar ${r.room.number}` : r.academicPeriod}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={r.status} />
                  </motion.li>
                ))}
              </ul>
            )}
          </Card>
        </Rise>

        <Rise inView delay={0.1}>
          <Card className="h-full p-5">
            <h3 className="font-bold text-ink">Ringkasan status</h3>
            <p className="mt-0.5 text-sm text-muted">Sebaran reservasi berdasarkan status.</p>
            {loading ? (
              <Spinner />
            ) : !segments.length ? (
              <EmptyState icon={BarChart3} title="Belum ada data" />
            ) : (
              <>
                <div className="mt-5">
                  <Donut segments={segments} centerLabel="reservasi" />
                </div>
                <ul className="mt-5 space-y-2.5">
                  {segments.map((s) => (
                    <li key={s.label} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium text-ink">
                        <span className="size-2.5 rounded-full" style={{ background: s.color }} />
                        {s.label}
                      </span>
                      <span className="font-bold text-brand-700">{s.value}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        </Rise>
      </section>

      {/* 3. Monitoring Pembayaran & Transaksi Midtrans */}
      <section id="pembayaran" className="scroll-mt-24 space-y-4">
        <Rise inView>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-ink">Monitoring Pembayaran & Transaksi</h2>
              <p className="mt-0.5 text-sm text-muted">
                Daftar tagihan mahasiswa, status rekonsiliasi gateway Midtrans Sandbox, dan riwayat penerimaan.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                {paymentSummary?.paidInvoices ?? 0} Lunas
              </span>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                {paymentSummary?.pendingInvoices ?? 0} Tertunda
              </span>
            </div>
          </div>
        </Rise>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-56 flex-1 sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <input
                  aria-label="Cari transaksi"
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  placeholder="Cari mahasiswa, NIM, atau nomor invoice…"
                  className={cx(fieldClass, 'pl-10')}
                />
              </div>
              <select
                aria-label="Filter status pembayaran"
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className={cx(fieldClass, '!w-auto font-semibold')}
              >
                <option value="ALL">Semua Status Tagihan</option>
                <option value="ISSUED">Menunggu Pembayaran (ISSUED)</option>
                <option value="PAID">Lunas (PAID)</option>
                <option value="EXPIRED">Kedaluwarsa (EXPIRED)</option>
                <option value="CANCELLED">Dibatalkan (CANCELLED)</option>
              </select>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void loadDashboard();
                void loadCatalog();
              }}
              disabled={loading}
            >
              <RefreshCw className={cx('size-3.5', loading && 'animate-spin')} />
              Muat Ulang
            </Button>
          </div>

          {filteredInvoices.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="Tidak ada transaksi yang cocok"
              description="Tidak ditemukan data pembayaran yang sesuai dengan kriteria filter."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-canvas">
                  <tr>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted">No. Invoice</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted">Mahasiswa</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted">Kamar & Asrama</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted">Nominal</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted">Status Tagihan</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted">Midtrans Gateway</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted">Tanggal Dibuat</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredInvoices.map((inv) => {
                    const student = inv.reservations?.student_profiles;
                    const room = inv.reservations?.room_assignments?.[0]?.rooms;
                    const latestPay = inv.payments?.[0];
                    return (
                      <tr key={inv.id} className="transition-colors hover:bg-brand-50/40">
                        <td className="px-4 py-3.5 font-mono text-xs font-bold text-brand-700">
                          {inv.invoice_number}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-ink">{student?.full_name ?? '—'}</p>
                          <p className="text-xs text-muted">{student?.nim ?? '—'}</p>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-ink">
                          {room ? `${room.buildings.name} · ${room.room_number}` : 'Kamar Asrama'}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-ink">
                          Rp {Number(inv.amount).toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={inv.status} />
                        </td>
                        <td className="px-4 py-3.5">
                          {latestPay ? (
                            <span
                              className={cx(
                                'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold',
                                latestPay.status === 'SUCCEEDED'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : latestPay.status === 'PENDING'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-rose-50 text-rose-700'
                              )}
                            >
                              {latestPay.provider_name || 'MIDTRANS'} · {latestPay.status}
                            </span>
                          ) : (
                            <span className="text-xs text-muted">Belum ada transaksi</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-muted">
                          {new Date(inv.issued_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {inv.status !== 'PAID' ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              loading={syncingInvoiceId === inv.id}
                              onClick={() => void handleSyncInvoice(inv.id)}
                            >
                              <RefreshCw className={cx('size-3.5', syncingInvoiceId === inv.id && 'animate-spin')} />
                              Sinkronkan
                            </Button>
                          ) : (
                            <span className="text-xs font-bold text-emerald-600">✓ Lunas</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      {/* 4. Gedung Asrama */}
      <section id="gedung" className="scroll-mt-24">
        <BuildingCards catalog={catalog} onManage={() => setCatalogOpen(true)} />
      </section>

      {/* 4. Pengelolaan Akun Staff */}
      <section id="staff" className="scroll-mt-24 space-y-4">
        <Rise inView>
          <SectionHeader
            title="Akun STAFF"
            description="Buat dan pantau akun petugas operasional asrama."
          />
        </Rise>
        <AdminManagementPanel />
      </section>

      {/* Modal Kelola Katalog Modern (Satu Form Dinamis) */}
      <CatalogManagementModal
        isOpen={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        catalog={catalog}
        reload={loadCatalog}
      />
    </AppShell>
  );
};
