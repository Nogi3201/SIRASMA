import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  BedDouble,
  Bell,
  Building2,
  ChevronLeft,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  UserCheck,
  UsersRound,
  X,
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext.js';
import { dashboardService, type AdminDashboardData } from '../services/dashboard.service.js';
import { managementService, type AcademicPeriod, type Building, type Facility, type Room } from '../services/management.service.js';
import { reservationsService, type Reservation } from '../services/reservations.service.js';
import { authAdminService, profileService } from '../services/auth-admin.service.js';

type DashboardDataState = 'loading' | 'empty' | 'error' | 'ready';

const AdminManagementPanel: React.FC = () => {
  const [staff, setStaff] = useState<{ id: string; email: string; is_active: boolean; staff_profiles?: { employee_identifier?: string | null } | null }[]>([]);
  const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', employeeIdentifier: '', phoneNumber: '' });
  const load = async () => { try { setStaff(await managementService.staffs()); } catch (e) { setError(e instanceof Error ? e.message : 'Daftar STAFF tidak dapat dimuat.'); } };
  useEffect(() => { void load(); }, []);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setSaving(true); setError(''); setSuccess(''); try { await authAdminService.createStaff(form); setForm({ fullName: '', email: '', password: '', employeeIdentifier: '', phoneNumber: '' }); setSuccess('Akun STAFF berhasil dibuat.'); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Akun STAFF gagal dibuat.'); } finally { setSaving(false); } };
  return <section className="mt-7 grid gap-6 xl:grid-cols-2"><article className="border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold text-[#17243A]">Tambah akun STAFF</h3><p className="mt-1 text-sm text-slate-500">Akun baru selalu dibuat dengan role STAFF.</p>{error && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}{success && <p className="mt-3 rounded bg-emerald-50 p-2 text-sm text-emerald-700">{success}</p>}<form className="mt-4 grid gap-3" onSubmit={submit}>{[['fullName','Nama lengkap'],['email','Email'],['employeeIdentifier','ID pegawai'],['phoneNumber','Nomor telepon']].map(([key,label]) => <label key={key} className="text-sm font-semibold text-slate-700">{label}<input required={key === 'fullName' || key === 'email'} value={form[key as keyof typeof form]} onChange={e => setForm({ ...form, [key]: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>)}<label className="text-sm font-semibold text-slate-700">Password<input required type="password" minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label><button disabled={saving} className="rounded-lg bg-[#203B78] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Menyimpan…' : 'Buat akun STAFF'}</button></form></article><article className="border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold text-[#17243A]">STAFF aktif</h3><div className="mt-4 divide-y divide-slate-100">{staff.length === 0 ? <p className="py-4 text-sm text-slate-500">Belum ada akun STAFF.</p> : staff.map(item => <div key={item.id} className="py-3"><p className="font-semibold text-slate-800">{item.email}</p><p className="text-xs text-slate-500">{item.staff_profiles?.employee_identifier || 'Tanpa ID pegawai'} · {item.is_active ? 'Aktif' : 'Nonaktif'}</p></div>)}</div></article></section>;
};

const CatalogManagementPanel: React.FC = () => {
  const [buildings, setBuildings] = useState<Building[]>([]); const [facilities, setFacilities] = useState<Facility[]>([]); const [rooms, setRooms] = useState<Room[]>([]); const [periods, setPeriods] = useState<AcademicPeriod[]>([]); const [notice, setNotice] = useState(''); const [error, setError] = useState('');
  const [buildingName, setBuildingName] = useState(''); const [facilityName, setFacilityName] = useState(''); const [room, setRoom] = useState({ buildingId: '', roomNumber: '', capacity: '1' });
  const now = new Date(); const date = (value: Date) => value.toISOString().slice(0, 10); const [period, setPeriod] = useState({ name: '', startDate: date(now), endDate: date(new Date(now.getFullYear(), now.getMonth() + 5, now.getDate())), registrationOpenAt: now.toISOString().slice(0, 16), registrationCloseAt: new Date(now.getTime() + 14 * 86400000).toISOString().slice(0, 16) });
  const load = async () => { try { const [b, f, r, p] = await Promise.all([managementService.buildings(), managementService.facilities(), managementService.rooms(), managementService.periods()]); setBuildings(b); setFacilities(f); setRooms(r); setPeriods(p); setRoom(value => ({ ...value, buildingId: value.buildingId || b[0]?.id || '' })); } catch (e) { setError(e instanceof Error ? e.message : 'Katalog tidak dapat dimuat.'); } };
  useEffect(() => { void load(); }, []);
  const run = async (work: () => Promise<unknown>, message: string) => { setError(''); setNotice(''); try { await work(); setNotice(message); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Operasi gagal.'); } };
  return <section className="mt-7 border border-slate-200 bg-white p-5 shadow-sm"><div><h3 className="font-bold text-[#17243A]">Katalog asrama</h3><p className="mt-1 text-sm text-slate-500">Kelola data sumber yang akan terlihat dalam pilihan kamar mahasiswa.</p></div>{error && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}{notice && <p className="mt-3 rounded bg-emerald-50 p-2 text-sm text-emerald-700">{notice}</p>}<div className="mt-5 grid gap-5 lg:grid-cols-3"><form onSubmit={e => { e.preventDefault(); void run(() => managementService.createBuilding({ name: buildingName }), 'Gedung ditambahkan.').then(() => setBuildingName('')); }} className="rounded-xl bg-slate-50 p-4"><p className="font-semibold text-slate-800">Tambah gedung</p><input required value={buildingName} onChange={e => setBuildingName(e.target.value)} placeholder="Nama gedung" className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"/><button className="mt-2 rounded-lg bg-[#203B78] px-3 py-2 text-sm font-bold text-white">Simpan gedung</button></form><form onSubmit={e => { e.preventDefault(); void run(() => managementService.createFacility({ name: facilityName }), 'Fasilitas ditambahkan.').then(() => setFacilityName('')); }} className="rounded-xl bg-slate-50 p-4"><p className="font-semibold text-slate-800">Tambah fasilitas</p><input required value={facilityName} onChange={e => setFacilityName(e.target.value)} placeholder="Contoh: Lemari" className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"/><button className="mt-2 rounded-lg bg-[#203B78] px-3 py-2 text-sm font-bold text-white">Simpan fasilitas</button></form><form onSubmit={e => { e.preventDefault(); void run(() => managementService.createRoom({ buildingId: room.buildingId, roomNumber: room.roomNumber, capacity: Number(room.capacity) }), 'Kamar ditambahkan.').then(() => setRoom({ buildingId: buildings[0]?.id || '', roomNumber: '', capacity: '1' })); }} className="rounded-xl bg-slate-50 p-4"><p className="font-semibold text-slate-800">Tambah kamar</p><select required value={room.buildingId} onChange={e => setRoom({ ...room, buildingId: e.target.value })} className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">Pilih gedung</option>{buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select><div className="mt-2 flex gap-2"><input required value={room.roomNumber} onChange={e => setRoom({ ...room, roomNumber: e.target.value })} placeholder="Nomor kamar" className="min-w-0 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"/><input required type="number" min="1" value={room.capacity} onChange={e => setRoom({ ...room, capacity: e.target.value })} className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"/></div><button className="mt-2 rounded-lg bg-[#203B78] px-3 py-2 text-sm font-bold text-white">Simpan kamar</button></form></div><form onSubmit={e => { e.preventDefault(); void run(() => managementService.createPeriod({ ...period, registrationOpenAt: new Date(period.registrationOpenAt).toISOString(), registrationCloseAt: new Date(period.registrationCloseAt).toISOString(), isActive: true }), 'Periode pendaftaran diaktifkan.').then(() => setPeriod({ ...period, name: '' })); }} className="mt-5 rounded-xl border border-orange-100 bg-orange-50 p-4"><p className="font-semibold text-slate-800">Buka periode reservasi</p><div className="mt-3 grid gap-2 md:grid-cols-5"><input required value={period.name} onChange={e => setPeriod({ ...period, name: e.target.value })} placeholder="Nama periode" className="rounded-lg border border-slate-300 px-3 py-2 text-sm"/><input required type="date" value={period.startDate} onChange={e => setPeriod({ ...period, startDate: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"/><input required type="date" value={period.endDate} onChange={e => setPeriod({ ...period, endDate: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"/><input required type="datetime-local" value={period.registrationOpenAt} onChange={e => setPeriod({ ...period, registrationOpenAt: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"/><input required type="datetime-local" value={period.registrationCloseAt} onChange={e => setPeriod({ ...period, registrationCloseAt: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"/></div><button className="mt-3 rounded-lg bg-[#F15A24] px-3 py-2 text-sm font-bold text-white">Simpan & aktifkan periode</button></form><div className="mt-6 grid gap-5 lg:grid-cols-4"><div><p className="text-sm font-bold text-slate-700">Gedung ({buildings.length})</p><div className="mt-2 space-y-2">{buildings.map(b => <p key={b.id} className="rounded border border-slate-100 p-2 text-sm">{b.name} <span className="text-slate-500">· {b._count?.rooms ?? 0} kamar</span></p>)}</div></div><div><p className="text-sm font-bold text-slate-700">Fasilitas ({facilities.length})</p><div className="mt-2 space-y-2">{facilities.map(f => <p key={f.id} className="rounded border border-slate-100 p-2 text-sm">{f.name}</p>)}</div></div><div><p className="text-sm font-bold text-slate-700">Kamar ({rooms.length})</p><div className="mt-2 space-y-2">{rooms.map(r => <p key={r.id} className="rounded border border-slate-100 p-2 text-sm">{r.buildings.name} · {r.room_number} <span className="text-slate-500">({r.capacity} org, {r.status})</span></p>)}</div></div><div><p className="text-sm font-bold text-slate-700">Periode</p><div className="mt-2 space-y-2">{periods.length === 0 ? <p className="text-sm text-slate-500">Belum ada periode.</p> : periods.map(p => <p key={p.id} className="rounded border border-slate-100 p-2 text-sm">{p.name} {p.is_active && <span className="font-bold text-emerald-600">· Aktif</span>}</p>)}</div></div></div></section>;
};

export const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [studentError, setStudentError] = useState('');
  const [submittingRoom, setSubmittingRoom] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogBuilding, setCatalogBuilding] = useState('ALL');
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [studentNotice, setStudentNotice] = useState('');
  const [profileForm, setProfileForm] = useState({ fullName: user?.studentProfile?.fullName ?? '', studyProgram: user?.studentProfile?.studyProgram ?? '', activeSemester: String(user?.studentProfile?.activeSemester ?? '') });
  const loadStudent = async () => { try { const [roomData, reservationData] = await Promise.all([managementService.rooms(true), reservationsService.mine()]); setRooms(roomData); setReservations(reservationData); } catch (error) { setStudentError(error instanceof Error ? error.message : 'Data tidak dapat dimuat.'); } };
  useEffect(() => { void loadStudent(); }, []);
  const reserve = async (roomId: string) => { setSubmittingRoom(roomId); setStudentError(''); try { await reservationsService.create(roomId); await loadStudent(); } catch (error) { setStudentError(error instanceof Error ? error.message : 'Pengajuan gagal dibuat.'); } finally { setSubmittingRoom(null); } };
  const cancelReservation = async (id: string) => { const reason = window.prompt('Alasan pembatalan pengajuan:'); if (!reason?.trim()) return; try { await reservationsService.cancel(id, reason); await loadStudent(); } catch (error) { setStudentError(error instanceof Error ? error.message : 'Pembatalan gagal.'); } };
  const updateProfile = async (event: React.FormEvent) => { event.preventDefault(); setProfileSaving(true); setStudentError(''); try { await profileService.updateStudent({ fullName: profileForm.fullName, studyProgram: profileForm.studyProgram, activeSemester: Number(profileForm.activeSemester) }); setStudentNotice('Profil berhasil diperbarui. Silakan muat ulang halaman untuk memperbarui sapaan.'); setProfileOpen(false); } catch (error) { setStudentError(error instanceof Error ? error.message : 'Profil gagal diperbarui.'); } finally { setProfileSaving(false); } };
  const buildings = [...new Set(rooms.map((room) => room.buildings.name))];
  const filteredRooms = rooms.filter((room) => (catalogBuilding === 'ALL' || room.buildings.name === catalogBuilding) && `${room.buildings.name} ${room.room_number} ${room.description ?? ''} ${room.room_facilities.map((facility) => facility.facilities.name).join(' ')}`.toLowerCase().includes(catalogSearch.toLowerCase()));
  const studentStats = { total: reservations.length, processing: reservations.filter((item) => ['SUBMITTED', 'PENDING_ACADEMIC_VERIFICATION', 'PENDING_DOCUMENTS', 'PENDING_PAYMENT'].includes(item.status)).length, approved: reservations.filter((item) => ['ALLOCATED', 'CONFIRMED', 'COMPLETED'].includes(item.status)).length };

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
          <button type="button" onClick={() => setProfileOpen(true)} className="text-xs font-semibold text-indigo-700 hover:text-indigo-900">Profil</button>
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

        {studentError && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{studentError}</div>}
        {studentNotice && <div role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{studentNotice}</div>}
        <section className="mb-6 grid gap-3 sm:grid-cols-3">{[['Total reservasi', studentStats.total], ['Sedang diproses', studentStats.processing], ['Disetujui', studentStats.approved]].map(([label, value]) => <article key={label as string} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-extrabold text-indigo-700">{value}</p></article>)}</section>
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><h3 className="font-bold text-slate-900">Pengajuan & riwayat reservasi</h3><p className="mt-1 text-sm text-slate-500">Status pengajuan Anda pada periode aktif.</p></div><ClipboardList className="size-5 text-indigo-600" /></div>{reservations.length === 0 ? <p className="mt-5 text-sm text-slate-500">Belum ada pengajuan reservasi.</p> : <div className="mt-4 divide-y divide-slate-100">{reservations.map(item => <div key={item.id} className="flex items-center justify-between gap-3 py-3"><div><p className="font-semibold text-slate-700">{item.room_assignments?.[0] ? `${item.room_assignments[0].rooms.buildings.name} · Kamar ${item.room_assignments[0].rooms.room_number}` : item.academic_periods?.name}</p><p className="text-xs text-slate-500">{item.academic_periods?.name}</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{item.status.replaceAll('_', ' ')}</span>{['SUBMITTED', 'PENDING_ACADEMIC_VERIFICATION', 'PENDING_DOCUMENTS'].includes(item.status) && <button type="button" onClick={() => void cancelReservation(item.id)} className="text-xs font-bold text-red-600">Batalkan</button>}</div></div>)}</div>}</section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="font-bold text-slate-900">Kamar tersedia</h3><p className="mt-1 text-sm text-slate-500">Pilih kamar untuk mengajukan reservasi pada periode pendaftaran aktif.</p></div><div className="flex flex-wrap gap-2"><input value={catalogSearch} onChange={event => setCatalogSearch(event.target.value)} placeholder="Cari asrama, kamar, fasilitas" className="rounded-lg border border-slate-300 px-3 py-2 text-sm"/><select value={catalogBuilding} onChange={event => setCatalogBuilding(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="ALL">Semua asrama</option>{buildings.map(building => <option key={building} value={building}>{building}</option>)}</select></div></div><div className="mt-5 grid gap-4 md:grid-cols-2">{filteredRooms.length === 0 ? <p className="text-sm text-slate-500">Tidak ada kamar tersedia atau periode belum dibuka.</p> : filteredRooms.map(room => <article key={room.id} className="rounded-xl border border-slate-200 p-4"><div className="flex justify-between gap-3"><div><p className="font-bold text-slate-800">{room.buildings.name} · {room.room_number}</p><p className="mt-1 text-sm text-slate-500">Kapasitas {room.capacity} orang</p></div><span className="text-xs font-bold text-emerald-600">{room.status}</span></div>{room.description && <p className="mt-3 text-sm text-slate-600">{room.description}</p>}{room.room_rates[0] && <p className="mt-2 text-sm font-bold text-indigo-700">{room.room_rates[0].currency} {Number(room.room_rates[0].amount).toLocaleString('id-ID')}</p>}{room.room_facilities.length > 0 && <p className="mt-3 text-xs text-slate-500">{room.room_facilities.map(f => `${f.facilities.name} (${f.quantity})`).join(', ')}</p>}<button type="button" disabled={submittingRoom !== null} onClick={() => void reserve(room.id)} className="mt-4 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{submittingRoom === room.id ? 'Mengirim…' : 'Ajukan reservasi'}</button></article>)}</div></section>
      </main>
      {profileOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="student-profile-title"><form onSubmit={updateProfile} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h2 id="student-profile-title" className="text-lg font-extrabold text-slate-900">Profil mahasiswa</h2><p className="mt-1 text-sm text-slate-500">NIM dan email dikelola sistem.</p></div><button type="button" onClick={() => setProfileOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Tutup profil"><X className="size-5" /></button></div><label className="mt-5 block text-sm font-bold text-slate-700">Nama lengkap<input required minLength={3} value={profileForm.fullName} onChange={event => setProfileForm({ ...profileForm, fullName: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label><label className="mt-4 block text-sm font-bold text-slate-700">Program studi<input required value={profileForm.studyProgram} onChange={event => setProfileForm({ ...profileForm, studyProgram: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label><label className="mt-4 block text-sm font-bold text-slate-700">Semester aktif<input required type="number" min="1" value={profileForm.activeSemester} onChange={event => setProfileForm({ ...profileForm, activeSemester: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label><div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setProfileOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Batal</button><button disabled={profileSaving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{profileSaving ? 'Menyimpan…' : 'Simpan profil'}</button></div></form></div>}
    </div>
  );
};

export const StaffDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [items, setItems] = useState<Reservation[]>([]);
  const [staffError, setStaffError] = useState('');
  const [working, setWorking] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [rejecting, setRejecting] = useState<Reservation | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const loadStaff = async () => { setLoading(true); setStaffError(''); try { setItems(await reservationsService.all()); } catch (error) { setStaffError(error instanceof Error ? error.message : 'Data reservasi tidak dapat dimuat.'); } finally { setLoading(false); } };
  useEffect(() => { void loadStaff(); }, []);
  const changeStatus = async (reservation: Reservation, status: string, reason?: string) => { setWorking(reservation.id); setStaffError(''); setNotice(''); try { await reservationsService.changeStatus(reservation.id, status, reason); setSelected(null); setRejecting(null); setRejectionReason(''); setNotice(status === 'ALLOCATED' ? 'Pengajuan berhasil disetujui.' : 'Pengajuan berhasil ditolak.'); await loadStaff(); } catch (error) { setStaffError(error instanceof Error ? error.message : 'Status gagal diubah.'); } finally { setWorking(null); } };
  const approve = (reservation: Reservation) => { if (window.confirm(`Setujui pengajuan ${reservation.id.slice(0, 8).toUpperCase()}?`)) void changeStatus(reservation, 'ALLOCATED'); };
  const statuses = [...new Set(items.map((item) => item.status))];
  const visibleItems = items.filter((item) => { const haystack = `${item.id} ${item.student_profiles?.full_name ?? ''} ${item.student_profiles?.nim ?? ''}`.toLowerCase(); return (filter === 'ALL' || item.status === filter) && haystack.includes(search.trim().toLowerCase()); });
  const pageCount = Math.max(1, Math.ceil(visibleItems.length / pageSize));
  const pageItems = visibleItems.slice((Math.min(page, pageCount) - 1) * pageSize, Math.min(page, pageCount) * pageSize);
  const cancelledByStaff = (item: Reservation) => item.status === 'CANCELLED' && item.reservation_status_histories?.some((history) => history.new_status === 'CANCELLED' && ['STAFF', 'ADMIN'].includes(history.users?.role ?? ''));
  const stats = { total: items.length, waiting: items.filter((item) => ['SUBMITTED', 'PENDING_ACADEMIC_VERIFICATION', 'PENDING_DOCUMENTS'].includes(item.status)).length, approved: items.filter((item) => ['ALLOCATED', 'CONFIRMED', 'COMPLETED'].includes(item.status)).length, rejected: items.filter(cancelledByStaff).length, cancelled: items.filter((item) => item.status === 'CANCELLED' && !cancelledByStaff(item)).length };
  const roomLabel = (item: Reservation) => { const room = item.room_assignments?.[0]?.rooms; return room ? `${room.buildings.name} · ${room.room_number}` : 'Belum ada kamar'; };
  const formattedDate = (value?: string | null) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

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

      <main className="flex-1 max-w-7xl w-full mx-auto p-5 sm:p-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900">Halo, Staff {user?.email}</h2>
          <p className="text-sm text-slate-500 mt-1">
            ID Pegawai: {user?.staffProfile?.employeeIdentifier || 'Petugas Asrama'}
          </p>
          <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-600">Hak Akses: Memproses pengajuan reservasi. Pengelolaan akun, gedung, dan kamar tetap khusus ADMIN.</div>
        </div>
        {staffError && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{staffError}</div>}
        {notice && <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{notice}</div>}
        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{[["Total pengajuan", stats.total], ["Menunggu diproses", stats.waiting], ["Disetujui", stats.approved], ["Ditolak", stats.rejected], ["Dibatalkan", stats.cancelled]].map(([label, value]) => <article key={label as string} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-extrabold text-[#203B78]">{value}</p></article>)}</section>
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5"><div><h3 className="font-bold text-slate-900">Pengajuan reservasi</h3><p className="mt-1 text-sm text-slate-500">Tinjau detail mahasiswa dan proses pengajuan yang masuk.</p></div><div className="flex flex-wrap items-center gap-2"><input aria-label="Cari pengajuan" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Cari nama, NIM, atau kode" className="w-52 rounded-lg border border-slate-300 px-3 py-2 text-sm"/><select aria-label="Filter status reservasi" value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><option value="ALL">Semua status</option>{statuses.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select><button type="button" onClick={() => void loadStaff()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />Muat ulang</button></div></div>{loading ? <div className="grid min-h-64 place-items-center text-sm text-slate-500"><RefreshCw className="mb-2 size-5 animate-spin text-emerald-600" />Memuat pengajuan…</div> : visibleItems.length === 0 ? <div className="grid min-h-64 place-items-center px-5 text-center"><ClipboardList className="mb-3 size-7 text-slate-400" /><p className="font-semibold text-slate-700">Tidak ada pengajuan</p><p className="mt-1 text-sm text-slate-500">Tidak ada data yang cocok dengan pencarian atau filter.</p></div> : <><div className="overflow-x-auto"><table className="min-w-[920px] w-full text-left"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Kode</th><th className="px-5 py-3">Mahasiswa</th><th className="px-5 py-3">Asrama & kamar</th><th className="px-5 py-3">Tanggal pengajuan</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Tindakan</th></tr></thead><tbody className="divide-y divide-slate-100">{pageItems.map((item) => <tr key={item.id} className="hover:bg-slate-50/70"><td className="px-5 py-4 font-mono text-xs font-bold text-[#203B78]">{item.id.slice(0, 8).toUpperCase()}</td><td className="px-5 py-4"><p className="font-semibold text-slate-800">{item.student_profiles?.full_name ?? '—'}</p><p className="text-xs text-slate-500">{item.student_profiles?.nim ?? '—'}</p></td><td className="px-5 py-4 text-sm text-slate-700">{roomLabel(item)}</td><td className="px-5 py-4 text-sm text-slate-600">{formattedDate(item.submitted_at ?? item.created_at)}</td><td className="px-5 py-4"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{item.status.replaceAll('_', ' ')}</span></td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => setSelected(item)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Detail</button>{item.status === 'SUBMITTED' && <><button type="button" disabled={working === item.id} onClick={() => approve(item)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60">Setujui</button><button type="button" disabled={working === item.id} onClick={() => { setRejecting(item); setRejectionReason(''); }} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-60">Tolak</button></>}</div></td></tr>)}</tbody></table></div><div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-600"><span>{visibleItems.length} hasil · halaman {Math.min(page, pageCount)} dari {pageCount}</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border border-slate-300 px-3 py-1.5 disabled:opacity-40">Sebelumnya</button><button type="button" disabled={page >= pageCount} onClick={() => setPage(page + 1)} className="rounded border border-slate-300 px-3 py-1.5 disabled:opacity-40">Berikutnya</button></div></div></>}</section>
      </main>
      {selected && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="reservation-detail-title"><article className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 id="reservation-detail-title" className="text-lg font-extrabold text-slate-900">Detail pengajuan</h2><p className="mt-1 font-mono text-xs text-slate-500">{selected.id}</p></div><button type="button" onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Tutup detail"><X className="size-5" /></button></div><dl className="mt-5 grid gap-4 text-sm"><div><dt className="text-slate-500">Mahasiswa</dt><dd className="font-bold text-slate-800">{selected.student_profiles?.full_name} · {selected.student_profiles?.nim}</dd></div><div><dt className="text-slate-500">Kamar</dt><dd className="font-bold text-slate-800">{roomLabel(selected)}</dd></div><div><dt className="text-slate-500">Periode</dt><dd className="font-bold text-slate-800">{selected.academic_periods?.name ?? '—'}</dd></div><div><dt className="text-slate-500">Riwayat status</dt><dd className="mt-2 space-y-2">{selected.reservation_status_histories?.length ? selected.reservation_status_histories.map((history, index) => <p key={`${history.created_at}-${index}`} className="rounded-lg bg-slate-50 p-3"><span className="font-bold text-slate-800">{history.new_status.replaceAll('_', ' ')}</span><span className="block text-xs text-slate-500">{formattedDate(history.created_at)}{history.reason ? ` · ${history.reason}` : ''}</span></p>) : <span className="text-slate-500">Belum ada riwayat.</span>}</dd></div></dl></article></div>}
      {rejecting && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="reject-title"><form onSubmit={(event) => { event.preventDefault(); if (rejectionReason.trim()) void changeStatus(rejecting, 'CANCELLED', rejectionReason); }} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 id="reject-title" className="text-lg font-extrabold text-slate-900">Tolak pengajuan</h2><p className="mt-1 text-sm text-slate-500">Alasan penolakan akan terlihat pada riwayat mahasiswa.</p><label className="mt-4 block text-sm font-bold text-slate-700">Alasan penolakan<textarea required minLength={3} value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 p-3 font-normal" placeholder="Tuliskan alasan yang jelas…" /></label><div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setRejecting(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Batal</button><button disabled={working === rejecting.id} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{working === rejecting.id ? 'Memproses…' : 'Konfirmasi tolak'}</button></div></form></div>}
    </div>
  );
};

export const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dataState, setDataState] = useState<DashboardDataState>('loading');
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [loadError, setLoadError] = useState('');

  const loadDashboard = async () => {
    setDataState('loading');
    try {
      const response = await dashboardService.admin();
      setDashboard(response.data);
      setDataState(response.data.recentReservations.length ? 'ready' : 'empty');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Data dashboard tidak dapat dimuat.');
      setDataState('error');
    }
  };
  useEffect(() => { void loadDashboard(); }, []);

  const adminInitial = user?.email?.charAt(0).toUpperCase() || 'A';
  const summaryCards = [
    { label: 'Total mahasiswa', icon: UsersRound, value: dashboard?.totals.students },
    { label: 'Total staff', icon: UserCheck, value: dashboard?.totals.staff },
    { label: 'Total gedung asrama', icon: Building2, value: dashboard?.totals.buildings },
    { label: 'Total kamar', icon: BedDouble, value: dashboard?.totals.rooms },
    { label: 'Total reservasi', icon: ClipboardList, value: dashboard?.totals.reservations },
  ];
  const navItems = [
    { label: 'Ringkasan', icon: LayoutDashboard, current: true },
    { label: 'Analitik', icon: BarChart3, current: false },
  ];

  const sidebar = (
    <aside className={`flex h-full flex-col border-r border-slate-200 bg-white transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="flex h-20 items-center justify-between border-b border-slate-100 px-5">
        <div className={`min-w-0 ${sidebarCollapsed ? 'sr-only' : ''}`}>
          <p className="font-extrabold tracking-tight text-[#203B78]">SIRASMA</p>
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#F15A24]">Administrator</p>
        </div>
        <button type="button" onClick={() => setSidebarCollapsed((value) => !value)} className="hidden rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 lg:block" aria-label="Ciutkan sidebar">
          <ChevronLeft className={`size-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
        </button>
        <button type="button" onClick={() => setSidebarOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Tutup sidebar"><X className="size-4" /></button>
      </div>
      <nav className="flex-1 space-y-1 p-3" aria-label="Navigasi administrator">
        {navItems.map((item) => {
          const Icon = item.icon;
          return <button key={item.label} type="button" title={sidebarCollapsed ? item.label : undefined} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${item.current ? 'bg-[#203B78] text-white shadow-sm' : 'cursor-not-allowed text-slate-400'}`} aria-current={item.current ? 'page' : undefined} disabled={!item.current}><Icon className="size-4 shrink-0" /><span className={sidebarCollapsed ? 'sr-only' : ''}>{item.label}</span></button>;
        })}
      </nav>
      <div className="border-t border-slate-100 p-3">
        <button type="button" onClick={() => logout()} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"><LogOut className="size-4 shrink-0" /><span className={sidebarCollapsed ? 'sr-only' : ''}>Keluar</span></button>
      </div>
    </aside>
  );

  const dataStateContent = () => {
    if (dataState === 'loading') return <div className="grid min-h-52 place-items-center text-sm text-slate-500"><RefreshCw className="mb-3 size-5 animate-spin text-[#203B78]" />Memuat ringkasan reservasi…</div>;
    if (dataState === 'error') return <div className="grid min-h-52 place-items-center text-center"><AlertCircle className="mb-3 size-6 text-red-500" /><p className="font-semibold text-slate-800">Ringkasan belum dapat dimuat</p><p className="mt-1 text-sm text-slate-500">{loadError}</p><button type="button" onClick={() => void loadDashboard()} className="mt-3 text-sm font-bold text-[#203B78]">Coba lagi</button></div>;
    if (dataState === 'empty') return <div className="grid min-h-52 place-items-center text-center"><ClipboardList className="mb-3 size-6 text-slate-400" /><p className="font-semibold text-slate-700">Belum ada reservasi terbaru</p><p className="mt-1 text-sm text-slate-500">Data akan tampil ketika pengajuan tersedia.</p></div>;
    return <div className="divide-y divide-slate-100">{dashboard?.recentReservations.map((reservation) => <div key={reservation.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="font-semibold text-slate-800">{reservation.student.name} <span className="font-normal text-slate-500">({reservation.student.nim})</span></p><p className="mt-0.5 text-sm text-slate-500">{reservation.room ? `${reservation.room.building} · Kamar ${reservation.room.number}` : reservation.academicPeriod}</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#203B78]">{reservation.status.replaceAll('_', ' ')}</span></div>)}</div>;
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <div className={`fixed inset-y-0 left-0 z-50 hidden lg:block ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>{sidebar}</div>
      {sidebarOpen && <div className="fixed inset-0 z-50 lg:hidden"><button type="button" className="absolute inset-0 bg-slate-950/35" onClick={() => setSidebarOpen(false)} aria-label="Tutup menu" /><div className="relative h-full w-72 shadow-xl">{sidebar}</div></div>}
      <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3"><button type="button" onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Buka menu"><Menu className="size-5" /></button><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#F15A24]">Administrator</p><h1 className="text-lg font-extrabold text-[#203B78]">Dashboard SIRASMA</h1></div></div>
          <div className="flex items-center gap-3"><button type="button" className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Notifikasi"><Bell className="size-4" /></button><div className="flex items-center gap-2 border-l border-slate-200 pl-3"><span className="grid size-9 place-items-center rounded-full bg-[#203B78] text-sm font-bold text-white">{adminInitial}</span><div className="hidden text-right sm:block"><p className="max-w-48 truncate text-sm font-bold text-slate-700">{user?.email}</p><p className="text-xs font-semibold text-[#F15A24]">ADMIN</p></div></div></div>
        </header>
        <main className="mx-auto max-w-7xl p-5 sm:p-8"><div className="mb-8"><h2 className="text-2xl font-extrabold tracking-tight text-[#17243A]">Ringkasan sistem</h2><p className="mt-1 text-sm text-slate-500">Gambaran data operasional asrama dalam satu tempat.</p></div>
          <section aria-label="Statistik sistem" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{summaryCards.map((card) => { const Icon = card.icon; return <article key={card.label} className="min-h-36 border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><span className="grid size-9 place-items-center rounded-lg bg-blue-50 text-[#203B78]"><Icon className="size-4" /></span><span className="text-xs font-semibold text-slate-400">{dataState === 'loading' ? 'Memuat' : 'Aktual'}</span></div><p className="mt-5 text-sm font-semibold text-slate-600">{card.label}</p><p className="mt-1 text-2xl font-extrabold text-[#17243A]">{dataState === 'loading' ? '—' : card.value ?? '—'}</p></article>; })}</section>
          <section className="mt-7 border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h3 className="font-bold text-[#17243A]">Reservasi terbaru</h3><p className="mt-0.5 text-sm text-slate-500">Pengajuan terbaru dari mahasiswa.</p></div><ClipboardList className="size-5 text-[#203B78]" /></div>{dataStateContent()}</section>
          <AdminManagementPanel />
          <CatalogManagementPanel />
        </main>
      </div>
    </div>
  );
};

