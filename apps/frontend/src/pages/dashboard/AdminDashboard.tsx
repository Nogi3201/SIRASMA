import React, { useEffect, useState } from 'react';
import { AlertCircle, BarChart3, BedDouble, Building2, ClipboardList, LayoutDashboard, Library, RefreshCw, UserCheck, UserPlus, UsersRound } from 'lucide-react';
import { dashboardService, type AdminDashboardData } from '../../services/dashboard.service.js';
import { managementService, type AcademicPeriod, type Building, type Facility, type Room } from '../../services/management.service.js';
import { authAdminService } from '../../services/auth-admin.service.js';
import { AppShell, type ShellNavItem } from '../../layouts/AppShell.js';
import { Alert, Button, Card, EmptyState, Field, SectionHeader, Spinner, StatCard, StatusBadge, cx, fieldClass } from '../../components/ui.js';

type DashboardDataState = 'loading' | 'empty' | 'error' | 'ready';

const AdminManagementPanel: React.FC = () => {
  const [staff, setStaff] = useState<{ id: string; email: string; is_active: boolean; staff_profiles?: { employee_identifier?: string | null } | null }[]>([]);
  const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', employeeIdentifier: '', phoneNumber: '' });
  const load = async () => { try { setStaff(await managementService.staffs()); } catch (e) { setError(e instanceof Error ? e.message : 'Daftar STAFF tidak dapat dimuat.'); } };
  useEffect(() => { void load(); }, []);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setSaving(true); setError(''); setSuccess(''); try { await authAdminService.createStaff(form); setForm({ fullName: '', email: '', password: '', employeeIdentifier: '', phoneNumber: '' }); setSuccess('Akun STAFF berhasil dibuat.'); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Akun STAFF gagal dibuat.'); } finally { setSaving(false); } };
  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <Card as="article" className="p-6 xl:col-span-3">
        <h3 className="flex items-center gap-2 font-bold text-ink"><UserPlus className="size-5 text-brand-700" />Tambah akun STAFF</h3>
        <p className="mt-1 text-sm text-muted">Akun baru selalu dibuat dengan role STAFF.</p>
        <div className="mt-4 space-y-3">{error && <Alert tone="error">{error}</Alert>}{success && <Alert tone="success">{success}</Alert>}</div>
        <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          {[['fullName', 'Nama lengkap'], ['email', 'Email'], ['employeeIdentifier', 'ID pegawai'], ['phoneNumber', 'Nomor telepon']].map(([key, label]) => (
            <Field key={key} label={label}><input required={key === 'fullName' || key === 'email'} value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className={fieldClass} /></Field>
          ))}
          <div className="sm:col-span-2"><Field label="Password"><input required type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={fieldClass} /></Field></div>
          <div className="sm:col-span-2"><Button type="submit" loading={saving}>{saving ? 'Menyimpan…' : 'Buat akun STAFF'}</Button></div>
        </form>
      </Card>
      <Card as="article" className="p-6 xl:col-span-2">
        <h3 className="font-bold text-ink">STAFF aktif <span className="ml-1 text-sm font-medium text-muted">({staff.length})</span></h3>
        <div className="mt-4 divide-y divide-line">
          {staff.length === 0 ? <p className="py-4 text-sm text-muted">Belum ada akun STAFF.</p> : staff.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-3">
              <span className="grid size-9 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">{item.email.charAt(0).toUpperCase()}</span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{item.email}</p><p className="text-xs text-muted">{item.staff_profiles?.employee_identifier || 'Tanpa ID pegawai'}</p></div>
              <StatusBadge status={item.is_active ? 'Aktif' : 'Nonaktif'} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

const CatalogManagementPanel: React.FC = () => {
  const [buildings, setBuildings] = useState<Building[]>([]); const [facilities, setFacilities] = useState<Facility[]>([]); const [rooms, setRooms] = useState<Room[]>([]); const [periods, setPeriods] = useState<AcademicPeriod[]>([]); const [notice, setNotice] = useState(''); const [error, setError] = useState('');
  const [buildingName, setBuildingName] = useState(''); const [facilityName, setFacilityName] = useState(''); const [room, setRoom] = useState({ buildingId: '', roomNumber: '', capacity: '1' });
  const now = new Date(); const date = (value: Date) => value.toISOString().slice(0, 10); const [period, setPeriod] = useState({ name: '', startDate: date(now), endDate: date(new Date(now.getFullYear(), now.getMonth() + 5, now.getDate())), registrationOpenAt: now.toISOString().slice(0, 16), registrationCloseAt: new Date(now.getTime() + 14 * 86400000).toISOString().slice(0, 16) });
  const load = async () => { try { const [b, f, r, p] = await Promise.all([managementService.buildings(), managementService.facilities(), managementService.rooms(), managementService.periods()]); setBuildings(b); setFacilities(f); setRooms(r); setPeriods(p); setRoom((value) => ({ ...value, buildingId: value.buildingId || b[0]?.id || '' })); } catch (e) { setError(e instanceof Error ? e.message : 'Katalog tidak dapat dimuat.'); } };
  useEffect(() => { void load(); }, []);
  const run = async (work: () => Promise<unknown>, message: string) => { setError(''); setNotice(''); try { await work(); setNotice(message); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Operasi gagal.'); } };
  const mini = 'rounded-xl bg-canvas p-4';
  const list = 'mt-2 max-h-56 space-y-2 overflow-y-auto pr-1';
  const item = 'rounded-xl border border-line px-3 py-2 text-sm';
  return (
    <Card className="p-6">
      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}
      {notice && <div className="mb-4"><Alert tone="success">{notice}</Alert></div>}
      <div className="grid gap-4 lg:grid-cols-3">
        <form onSubmit={(e) => { e.preventDefault(); void run(() => managementService.createBuilding({ name: buildingName }), 'Gedung ditambahkan.').then(() => setBuildingName('')); }} className={mini}>
          <p className="font-semibold text-ink">Tambah gedung</p>
          <input required value={buildingName} onChange={(e) => setBuildingName(e.target.value)} placeholder="Nama gedung" className={cx(fieldClass, 'mt-3')} />
          <Button type="submit" size="sm" className="mt-3">Simpan gedung</Button>
        </form>
        <form onSubmit={(e) => { e.preventDefault(); void run(() => managementService.createFacility({ name: facilityName }), 'Fasilitas ditambahkan.').then(() => setFacilityName('')); }} className={mini}>
          <p className="font-semibold text-ink">Tambah fasilitas</p>
          <input required value={facilityName} onChange={(e) => setFacilityName(e.target.value)} placeholder="Contoh: Lemari" className={cx(fieldClass, 'mt-3')} />
          <Button type="submit" size="sm" className="mt-3">Simpan fasilitas</Button>
        </form>
        <form onSubmit={(e) => { e.preventDefault(); void run(() => managementService.createRoom({ buildingId: room.buildingId, roomNumber: room.roomNumber, capacity: Number(room.capacity) }), 'Kamar ditambahkan.').then(() => setRoom({ buildingId: buildings[0]?.id || '', roomNumber: '', capacity: '1' })); }} className={mini}>
          <p className="font-semibold text-ink">Tambah kamar</p>
          <select required value={room.buildingId} onChange={(e) => setRoom({ ...room, buildingId: e.target.value })} className={cx(fieldClass, 'mt-3')}><option value="">Pilih gedung</option>{buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
          <div className="mt-2 flex gap-2"><input required value={room.roomNumber} onChange={(e) => setRoom({ ...room, roomNumber: e.target.value })} placeholder="Nomor kamar" className={cx(fieldClass, 'min-w-0')} /><input required type="number" min="1" value={room.capacity} onChange={(e) => setRoom({ ...room, capacity: e.target.value })} className={cx(fieldClass, 'w-20')} aria-label="Kapasitas" /></div>
          <Button type="submit" size="sm" className="mt-3">Simpan kamar</Button>
        </form>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); void run(() => managementService.createPeriod({ ...period, registrationOpenAt: new Date(period.registrationOpenAt).toISOString(), registrationCloseAt: new Date(period.registrationCloseAt).toISOString(), isActive: true }), 'Periode pendaftaran diaktifkan.').then(() => setPeriod({ ...period, name: '' })); }} className="mt-4 rounded-xl border border-accent-100 bg-accent-50/60 p-4">
        <p className="font-semibold text-ink">Buka periode reservasi</p>
        <div className="mt-3 grid gap-3 md:grid-cols-5">
          <input required value={period.name} onChange={(e) => setPeriod({ ...period, name: e.target.value })} placeholder="Nama periode" className={fieldClass} aria-label="Nama periode" />
          <input required type="date" value={period.startDate} onChange={(e) => setPeriod({ ...period, startDate: e.target.value })} className={fieldClass} aria-label="Tanggal mulai" />
          <input required type="date" value={period.endDate} onChange={(e) => setPeriod({ ...period, endDate: e.target.value })} className={fieldClass} aria-label="Tanggal selesai" />
          <input required type="datetime-local" value={period.registrationOpenAt} onChange={(e) => setPeriod({ ...period, registrationOpenAt: e.target.value })} className={fieldClass} aria-label="Pendaftaran dibuka" />
          <input required type="datetime-local" value={period.registrationCloseAt} onChange={(e) => setPeriod({ ...period, registrationCloseAt: e.target.value })} className={fieldClass} aria-label="Pendaftaran ditutup" />
        </div>
        <Button type="submit" variant="accent" size="sm" className="mt-3">Simpan & aktifkan periode</Button>
      </form>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div><p className="text-sm font-bold text-ink">Gedung ({buildings.length})</p><div className={list}>{buildings.map((b) => <p key={b.id} className={item}>{b.name} <span className="text-muted">· {b._count?.rooms ?? 0} kamar</span></p>)}</div></div>
        <div><p className="text-sm font-bold text-ink">Fasilitas ({facilities.length})</p><div className={list}>{facilities.map((f) => <p key={f.id} className={item}>{f.name}</p>)}</div></div>
        <div><p className="text-sm font-bold text-ink">Kamar ({rooms.length})</p><div className={list}>{rooms.map((r) => <p key={r.id} className={item}>{r.buildings.name} · {r.room_number} <span className="text-muted">({r.capacity} org, {r.status})</span></p>)}</div></div>
        <div><p className="text-sm font-bold text-ink">Periode</p><div className={list}>{periods.length === 0 ? <p className="text-sm text-muted">Belum ada periode.</p> : periods.map((p) => <p key={p.id} className={item}>{p.name} {p.is_active && <span className="font-bold text-emerald-600">· Aktif</span>}</p>)}</div></div>
      </div>
    </Card>
  );
};

export const AdminDashboard: React.FC = () => {
  const [dataState, setDataState] = useState<DashboardDataState>('loading');
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [loadError, setLoadError] = useState('');

  const loadDashboard = async () => {
    setDataState('loading');
    try { const response = await dashboardService.admin(); setDashboard(response.data); setDataState(response.data.recentReservations.length ? 'ready' : 'empty'); }
    catch (error) { setLoadError(error instanceof Error ? error.message : 'Data dashboard tidak dapat dimuat.'); setDataState('error'); }
  };
  useEffect(() => { void loadDashboard(); }, []);

  const loading = dataState === 'loading';
  const summaryCards = [
    { label: 'Total mahasiswa', icon: UsersRound, value: dashboard?.totals.students, tone: 'brand' as const },
    { label: 'Total staff', icon: UserCheck, value: dashboard?.totals.staff, tone: 'violet' as const },
    { label: 'Gedung asrama', icon: Building2, value: dashboard?.totals.buildings, tone: 'emerald' as const },
    { label: 'Total kamar', icon: BedDouble, value: dashboard?.totals.rooms, tone: 'accent' as const },
    { label: 'Total reservasi', icon: ClipboardList, value: dashboard?.totals.reservations, tone: 'brand' as const },
  ];
  const nav: ShellNavItem[] = [
    { id: 'ringkasan', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'reservasi', label: 'Reservasi Terbaru', icon: BarChart3 },
    { id: 'staff', label: 'Akun Staff', icon: UserPlus },
    { id: 'katalog', label: 'Katalog Asrama', icon: Library },
  ];
  const maxStatus = Math.max(1, ...(dashboard?.statusSummary.map((s) => s.count) ?? [1]));

  return (
    <AppShell roleLabel="Administrator" title="Dashboard Admin" nav={nav}>
      <section id="ringkasan" className="scroll-mt-24 space-y-6">
        <div className="animate-fade-up"><h2 className="text-2xl font-extrabold tracking-tight text-ink">Ringkasan sistem</h2><p className="mt-1 text-sm text-muted">Gambaran data operasional asrama dalam satu tempat.</p></div>
        <div aria-label="Statistik sistem" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map((c) => <StatCard key={c.label} label={c.label} icon={c.icon} tone={c.tone} value={loading ? '—' : c.value ?? '—'} />)}
        </div>
      </section>

      <section id="reservasi" className="scroll-mt-24 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between border-b border-line px-5 py-4"><div><h3 className="font-bold text-ink">Reservasi terbaru</h3><p className="mt-0.5 text-sm text-muted">Pengajuan terbaru dari mahasiswa.</p></div><Button variant="secondary" size="sm" onClick={() => void loadDashboard()} disabled={loading}><RefreshCw className={cx('size-4', loading && 'animate-spin')} />Muat ulang</Button></div>
          {loading ? <Spinner label="Memuat ringkasan reservasi…" />
            : dataState === 'error' ? <EmptyState icon={AlertCircle} title="Ringkasan belum dapat dimuat" description={loadError} action={<Button variant="ghost" size="sm" onClick={() => void loadDashboard()}>Coba lagi</Button>} />
            : dataState === 'empty' ? <EmptyState icon={ClipboardList} title="Belum ada reservasi terbaru" description="Data akan tampil ketika pengajuan tersedia." />
            : <ul className="divide-y divide-line">{dashboard?.recentReservations.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-canvas/60">
                  <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">{r.student.name.charAt(0)}</span><div><p className="font-semibold text-ink">{r.student.name} <span className="font-normal text-muted">({r.student.nim})</span></p><p className="mt-0.5 text-sm text-muted">{r.room ? `${r.room.building} · Kamar ${r.room.number}` : r.academicPeriod}</p></div></div>
                  <StatusBadge status={r.status} />
                </li>))}</ul>}
        </Card>
        <Card className="p-5">
          <h3 className="font-bold text-ink">Ringkasan status</h3><p className="mt-0.5 text-sm text-muted">Sebaran reservasi berdasarkan status.</p>
          {loading ? <Spinner /> : !dashboard?.statusSummary.length ? <EmptyState icon={BarChart3} title="Belum ada data" /> : (
            <ul className="mt-5 space-y-4">{dashboard.statusSummary.map((s) => (
              <li key={s.status}><div className="flex items-center justify-between text-sm"><span className="font-medium text-ink">{s.status.replaceAll('_', ' ')}</span><span className="font-bold text-brand-700">{s.count}</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-canvas"><div className="h-full rounded-full bg-gradient-to-r from-brand-700 to-brand-500 transition-all duration-700" style={{ width: `${(s.count / maxStatus) * 100}%` }} /></div></li>
            ))}</ul>)}
        </Card>
      </section>

      <section id="staff" className="scroll-mt-24 space-y-4"><SectionHeader title="Akun STAFF" description="Buat dan pantau akun petugas operasional." /><AdminManagementPanel /></section>
      <section id="katalog" className="scroll-mt-24 space-y-4"><SectionHeader title="Katalog asrama" description="Kelola data sumber yang akan terlihat dalam pilihan kamar mahasiswa." /><CatalogManagementPanel /></section>
    </AppShell>
  );
};
