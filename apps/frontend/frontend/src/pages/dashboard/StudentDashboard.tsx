import React, { useEffect, useMemo, useState } from 'react';
import { BedDouble, CheckCircle2, ClipboardList, Clock, LayoutDashboard, Search, ShieldCheck, UserCheck, UserRound, Users } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext.js';
import { managementService, type Room } from '../../services/management.service.js';
import { reservationsService, type Reservation } from '../../services/reservations.service.js';
import { profileService } from '../../services/auth-admin.service.js';
import { AppShell, type ShellNavItem } from '../../layouts/AppShell.js';
import { Alert, Button, Card, EmptyState, Field, Modal, SectionHeader, StatCard, StatusBadge, cx, fieldClass } from '../../components/ui.js';

const PROCESSING = ['SUBMITTED', 'PENDING_ACADEMIC_VERIFICATION', 'PENDING_DOCUMENTS', 'PENDING_PAYMENT'];
const APPROVED = ['ALLOCATED', 'CONFIRMED', 'COMPLETED'];
const CANCELLABLE = ['SUBMITTED', 'PENDING_ACADEMIC_VERIFICATION', 'PENDING_DOCUMENTS'];

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [studentError, setStudentError] = useState('');
  const [studentNotice, setStudentNotice] = useState('');
  const [submittingRoom, setSubmittingRoom] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogBuilding, setCatalogBuilding] = useState('ALL');
  const [detail, setDetail] = useState<Room | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({ fullName: user?.studentProfile?.fullName ?? '', studyProgram: user?.studentProfile?.studyProgram ?? '', activeSemester: String(user?.studentProfile?.activeSemester ?? '') });

  const loadStudent = async () => { try { const [roomData, reservationData] = await Promise.all([managementService.rooms(true), reservationsService.mine()]); setRooms(roomData); setReservations(reservationData); } catch (error) { setStudentError(error instanceof Error ? error.message : 'Data tidak dapat dimuat.'); } };
  useEffect(() => { void loadStudent(); }, []);
  const reserve = async (roomId: string) => { setSubmittingRoom(roomId); setStudentError(''); try { await reservationsService.create(roomId); setDetail(null); await loadStudent(); } catch (error) { setStudentError(error instanceof Error ? error.message : 'Pengajuan gagal dibuat.'); setDetail(null); } finally { setSubmittingRoom(null); } };
  const cancelReservation = async (id: string) => { const reason = window.prompt('Alasan pembatalan pengajuan:'); if (!reason?.trim()) return; try { await reservationsService.cancel(id, reason); await loadStudent(); } catch (error) { setStudentError(error instanceof Error ? error.message : 'Pembatalan gagal.'); } };
  const updateProfile = async (event: React.FormEvent) => { event.preventDefault(); setProfileSaving(true); setStudentError(''); try { await profileService.updateStudent({ fullName: profileForm.fullName, studyProgram: profileForm.studyProgram, activeSemester: Number(profileForm.activeSemester) }); setStudentNotice('Profil berhasil diperbarui. Silakan muat ulang halaman untuk memperbarui sapaan.'); setProfileOpen(false); } catch (error) { setStudentError(error instanceof Error ? error.message : 'Profil gagal diperbarui.'); } finally { setProfileSaving(false); } };

  const buildings = [...new Set(rooms.map((room) => room.buildings.name))];
  const filteredRooms = useMemo(() => rooms.filter((room) => (catalogBuilding === 'ALL' || room.buildings.name === catalogBuilding) && `${room.buildings.name} ${room.room_number} ${room.description ?? ''} ${room.room_facilities.map((f) => f.facilities.name).join(' ')}`.toLowerCase().includes(catalogSearch.toLowerCase())), [rooms, catalogBuilding, catalogSearch]);
  const stats = { total: reservations.length, processing: reservations.filter((i) => PROCESSING.includes(i.status)).length, approved: reservations.filter((i) => APPROVED.includes(i.status)).length };
  const price = (room: Room) => room.room_rates[0] ? `${room.room_rates[0].currency} ${Number(room.room_rates[0].amount).toLocaleString('id-ID')}` : null;

  const nav: ShellNavItem[] = [
    { id: 'ringkasan', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'reservasi', label: 'Reservasi Saya', icon: ClipboardList },
    { id: 'katalog', label: 'Katalog Kamar', icon: BedDouble },
    { id: 'profil', label: 'Profil', icon: UserRound, onClick: () => setProfileOpen(true) },
  ];

  return (
    <AppShell roleLabel="Portal Mahasiswa" title="Portal Mahasiswa" nav={nav}>
      {studentError && <Alert tone="error">{studentError}</Alert>}
      {studentNotice && <Alert tone="success">{studentNotice}</Alert>}

      <section id="ringkasan" className="scroll-mt-24 space-y-6">
        <Card className="animate-fade-up relative overflow-hidden bg-gradient-to-br from-brand-700 to-brand-900 p-6 text-white sm:p-8">
          <div className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-accent-500/25 blur-2xl" />
          <p className="text-xs font-bold uppercase tracking-[.16em] text-accent-100">Selamat datang</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{user?.studentProfile?.fullName || user?.email}</h2>
          <p className="mt-1 text-sm text-brand-200">{user?.email}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[['NIM', user?.studentProfile?.nim || '-'], ['Program Studi', user?.studentProfile?.studyProgram || '-'], ['Status Verifikasi', user?.studentProfile?.academicStatus || 'PENDING']].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur"><p className="text-xs font-semibold uppercase tracking-wide text-brand-200">{k}</p><p className="mt-1 flex items-center gap-1.5 text-sm font-bold">{k === 'Status Verifikasi' && <UserCheck className="size-4 text-accent-100" />}{v}</p></div>
            ))}
          </div>
        </Card>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total reservasi" value={stats.total} icon={ClipboardList} tone="brand" />
          <StatCard label="Sedang diproses" value={stats.processing} icon={Clock} tone="accent" />
          <StatCard label="Disetujui" value={stats.approved} icon={CheckCircle2} tone="emerald" />
        </div>
      </section>

      <section id="reservasi" className="scroll-mt-24 space-y-4">
        <SectionHeader title="Pengajuan & riwayat reservasi" description="Status pengajuan Anda pada periode aktif." />
        <Card>
          {reservations.length === 0 ? <EmptyState icon={ClipboardList} title="Belum ada pengajuan reservasi" description="Pilih kamar pada katalog di bawah untuk mulai mengajukan." /> : (
            <ul className="divide-y divide-line">
              {reservations.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><BedDouble className="size-5" /></span>
                    <div><p className="font-semibold text-ink">{item.room_assignments?.[0] ? `${item.room_assignments[0].rooms.buildings.name} · Kamar ${item.room_assignments[0].rooms.room_number}` : item.academic_periods?.name}</p><p className="text-xs text-muted">{item.academic_periods?.name}</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={item.status} />
                    {CANCELLABLE.includes(item.status) && <Button variant="danger" size="sm" onClick={() => void cancelReservation(item.id)}>Batalkan</Button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section id="katalog" className="scroll-mt-24 space-y-4">
        <SectionHeader title="Kamar tersedia" description="Pilih kamar untuk mengajukan reservasi pada periode pendaftaran aktif." />
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-60 flex-1 sm:max-w-sm"><Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" /><input aria-label="Cari kamar" value={catalogSearch} onChange={(e) => setCatalogSearch(e.target.value)} placeholder="Cari asrama, kamar, fasilitas" className={cx(fieldClass, 'pl-10')} /></div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter asrama">
            {['ALL', ...buildings].map((b) => (
              <button key={b} type="button" role="tab" aria-selected={catalogBuilding === b} onClick={() => setCatalogBuilding(b)} className={cx('cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition', catalogBuilding === b ? 'bg-brand-700 text-white shadow-sm' : 'border border-line bg-white text-muted hover:text-ink')}>{b === 'ALL' ? 'Semua asrama' : b}</button>
            ))}
          </div>
        </div>
        {filteredRooms.length === 0 ? <Card><EmptyState icon={BedDouble} title="Tidak ada kamar tersedia" description="Periode belum dibuka atau tidak ada kamar yang cocok dengan pencarian." /></Card> : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredRooms.map((room) => (
              <Card as="article" key={room.id} className="animate-fade-up group overflow-hidden transition hover:-translate-y-1 hover:shadow-pop">
                <div className="relative grid h-36 place-items-center bg-gradient-to-br from-brand-100 via-brand-50 to-accent-50">
                  <BedDouble className="size-10 text-brand-500/70 transition group-hover:scale-110" />
                  <span className="absolute left-4 top-4"><StatusBadge status={room.status} /></span>
                  {price(room) && <span className="absolute bottom-3 right-4 rounded-full bg-white/90 px-3 py-1 text-sm font-extrabold text-brand-700 shadow-sm">{price(room)}</span>}
                </div>
                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent-500">{room.buildings.name}</p>
                  <h3 className="mt-1 text-lg font-bold text-ink">Kamar {room.room_number}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted"><Users className="size-4" />Kapasitas {room.capacity} orang</p>
                  {room.room_facilities.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{room.room_facilities.slice(0, 4).map((f) => <span key={f.facilities.id} className="rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-muted">{f.facilities.name} ({f.quantity})</span>)}{room.room_facilities.length > 4 && <span className="rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-muted">+{room.room_facilities.length - 4}</span>}</div>}
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <Button variant="secondary" onClick={() => setDetail(room)}>Detail</Button>
                    <Button variant="accent" disabled={submittingRoom !== null} loading={submittingRoom === room.id} onClick={() => void reserve(room.id)}>Ajukan</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {detail && (
        <Modal title={`${detail.buildings.name} · Kamar ${detail.room_number}`} description={`Kapasitas ${detail.capacity} orang`} onClose={() => setDetail(null)} size="lg" labelledBy="room-detail-title">
          <div className="grid h-40 place-items-center rounded-xl bg-gradient-to-br from-brand-100 via-brand-50 to-accent-50"><BedDouble className="size-12 text-brand-500/70" /></div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><StatusBadge status={detail.status} />{price(detail) && <p className="text-xl font-extrabold text-brand-700">{price(detail)}</p>}</div>
          {detail.description && <p className="mt-4 text-sm leading-6 text-muted">{detail.description}</p>}
          <h3 className="mt-5 flex items-center gap-2 text-sm font-bold text-ink"><ShieldCheck className="size-4 text-brand-700" />Fasilitas</h3>
          {detail.room_facilities.length ? <ul className="mt-2 grid gap-2 sm:grid-cols-2">{detail.room_facilities.map((f) => <li key={f.facilities.id} className="flex items-center justify-between rounded-xl bg-canvas px-3.5 py-2.5 text-sm"><span className="font-medium text-ink">{f.facilities.name}</span><span className="text-muted">×{f.quantity}</span></li>)}</ul> : <p className="mt-2 text-sm text-muted">Belum ada data fasilitas.</p>}
          <div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={() => setDetail(null)}>Tutup</Button><Button variant="accent" disabled={submittingRoom !== null} loading={submittingRoom === detail.id} onClick={() => void reserve(detail.id)}>Ajukan reservasi</Button></div>
        </Modal>
      )}

      {profileOpen && (
        <Modal title="Profil mahasiswa" description="NIM dan email dikelola sistem." onClose={() => setProfileOpen(false)} labelledBy="student-profile-title">
          <form onSubmit={updateProfile} className="space-y-4">
            <Field label="Nama lengkap"><input required minLength={3} value={profileForm.fullName} onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })} className={fieldClass} /></Field>
            <Field label="Program studi"><input required value={profileForm.studyProgram} onChange={(e) => setProfileForm({ ...profileForm, studyProgram: e.target.value })} className={fieldClass} /></Field>
            <Field label="Semester aktif"><input required type="number" min="1" value={profileForm.activeSemester} onChange={(e) => setProfileForm({ ...profileForm, activeSemester: e.target.value })} className={fieldClass} /></Field>
            <div className="flex justify-end gap-3 pt-2"><Button variant="secondary" onClick={() => setProfileOpen(false)}>Batal</Button><Button type="submit" loading={profileSaving}>{profileSaving ? 'Menyimpan…' : 'Simpan profil'}</Button></div>
          </form>
        </Modal>
      )}
    </AppShell>
  );
};
