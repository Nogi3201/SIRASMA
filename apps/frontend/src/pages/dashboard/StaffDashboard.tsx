import React, { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardList, Clock, LayoutDashboard, RefreshCw, Search, XCircle, Ban } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext.js';
import { reservationsService, type Reservation } from '../../services/reservations.service.js';
import { AppShell, type ShellNavItem } from '../../layouts/AppShell.js';
import { Alert, Button, Card, EmptyState, Field, Modal, Pagination, SectionHeader, Spinner, StatCard, StatusBadge, Td, Th, cx, fieldClass, formatDate } from '../../components/ui.js';

const WAITING = ['SUBMITTED', 'PENDING_ACADEMIC_VERIFICATION', 'PENDING_DOCUMENTS'];
const APPROVED = ['ALLOCATED', 'CONFIRMED', 'COMPLETED'];

export const StaffDashboard: React.FC = () => {
  const { user } = useAuth();
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

  const statuses = [...new Set(items.map((i) => i.status))];
  const visibleItems = items.filter((item) => { const haystack = `${item.id} ${item.student_profiles?.full_name ?? ''} ${item.student_profiles?.nim ?? ''}`.toLowerCase(); return (filter === 'ALL' || item.status === filter) && haystack.includes(search.trim().toLowerCase()); });
  const pageCount = Math.max(1, Math.ceil(visibleItems.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageItems = visibleItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const cancelledByStaff = (item: Reservation) => item.status === 'CANCELLED' && item.reservation_status_histories?.some((h) => h.new_status === 'CANCELLED' && ['STAFF', 'ADMIN'].includes(h.users?.role ?? ''));
  const stats = { total: items.length, waiting: items.filter((i) => WAITING.includes(i.status)).length, approved: items.filter((i) => APPROVED.includes(i.status)).length, rejected: items.filter(cancelledByStaff).length, cancelled: items.filter((i) => i.status === 'CANCELLED' && !cancelledByStaff(i)).length };
  const roomLabel = (item: Reservation) => { const room = item.room_assignments?.[0]?.rooms; return room ? `${room.buildings.name} · ${room.room_number}` : 'Belum ada kamar'; };

  const nav: ShellNavItem[] = [
    { id: 'ringkasan', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'pengajuan', label: 'Pengajuan Reservasi', icon: ClipboardList },
  ];

  return (
    <AppShell roleLabel="Staff Operasional" title="Dashboard Staff" nav={nav}>
      <section id="ringkasan" className="scroll-mt-24 space-y-6">
        <div className="animate-fade-up"><h2 className="text-2xl font-extrabold tracking-tight text-ink">Halo, {user?.email}</h2><p className="mt-1 text-sm text-muted">ID Pegawai: {user?.staffProfile?.employeeIdentifier || 'Petugas Asrama'} · Hak akses: memproses pengajuan reservasi. Pengelolaan akun, gedung, dan kamar khusus ADMIN.</p></div>
        {staffError && <Alert tone="error">{staffError}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total pengajuan" value={stats.total} icon={ClipboardList} tone="brand" />
          <StatCard label="Menunggu diproses" value={stats.waiting} icon={Clock} tone="accent" />
          <StatCard label="Disetujui" value={stats.approved} icon={CheckCircle2} tone="emerald" />
          <StatCard label="Ditolak" value={stats.rejected} icon={XCircle} tone="violet" />
          <StatCard label="Dibatalkan" value={stats.cancelled} icon={Ban} tone="brand" />
        </div>
      </section>

      <section id="pengajuan" className="scroll-mt-24 space-y-4">
        <SectionHeader title="Pengajuan reservasi" description="Tinjau detail mahasiswa dan proses pengajuan yang masuk." />
        <Card>
          <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
            <div className="relative min-w-56 flex-1 sm:max-w-xs"><Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" /><input aria-label="Cari pengajuan" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Cari nama, NIM, atau kode" className={cx(fieldClass, 'pl-10')} /></div>
            <select aria-label="Filter status reservasi" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }} className={cx(fieldClass, 'w-auto font-semibold')}><option value="ALL">Semua status</option>{statuses.map((s) => <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>)}</select>
            <Button variant="secondary" onClick={() => void loadStaff()} disabled={loading} className="ml-auto"><RefreshCw className={cx('size-4', loading && 'animate-spin')} />Muat ulang</Button>
          </div>
          {loading ? <Spinner label="Memuat pengajuan…" /> : visibleItems.length === 0 ? <EmptyState icon={ClipboardList} title="Tidak ada pengajuan" description="Tidak ada data yang cocok dengan pencarian atau filter." /> : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-left">
                  <thead className="bg-canvas"><tr><Th>Kode</Th><Th>Mahasiswa</Th><Th>Asrama & kamar</Th><Th>Tanggal pengajuan</Th><Th>Status</Th><Th className="text-right">Tindakan</Th></tr></thead>
                  <tbody className="divide-y divide-line">
                    {pageItems.map((item) => (
                      <tr key={item.id} className="transition hover:bg-canvas/60">
                        <Td className="font-mono text-xs font-bold text-brand-700">{item.id.slice(0, 8).toUpperCase()}</Td>
                        <Td><p className="font-semibold text-ink">{item.student_profiles?.full_name ?? '—'}</p><p className="text-xs text-muted">{item.student_profiles?.nim ?? '—'}</p></Td>
                        <Td className="text-ink">{roomLabel(item)}</Td>
                        <Td className="text-muted">{formatDate(item.submitted_at ?? item.created_at)}</Td>
                        <Td><StatusBadge status={item.status} /></Td>
                        <Td><div className="flex justify-end gap-2">
                          <Button variant="secondary" size="sm" onClick={() => setSelected(item)}>Detail</Button>
                          {item.status === 'SUBMITTED' && <><Button variant="success" size="sm" disabled={working === item.id} onClick={() => approve(item)}>Setujui</Button><Button variant="danger" size="sm" disabled={working === item.id} onClick={() => { setRejecting(item); setRejectionReason(''); }}>Tolak</Button></>}
                        </div></Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={currentPage} pageCount={pageCount} total={visibleItems.length} onChange={setPage} />
            </>
          )}
        </Card>
      </section>

      {selected && (
        <Modal title="Detail pengajuan" description={selected.id} onClose={() => setSelected(null)} size="lg" labelledBy="reservation-detail-title">
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            {[['Mahasiswa', `${selected.student_profiles?.full_name ?? '—'} · ${selected.student_profiles?.nim ?? '—'}`], ['Kamar', roomLabel(selected)], ['Periode', selected.academic_periods?.name ?? '—']].map(([k, v]) => <div key={k} className="rounded-xl bg-canvas p-3.5"><dt className="text-xs text-muted">{k}</dt><dd className="mt-1 font-bold text-ink">{v}</dd></div>)}
          </dl>
          <h3 className="mt-5 text-sm font-bold text-ink">Riwayat status</h3>
          <ol className="mt-3 space-y-3 border-l-2 border-brand-100 pl-4">
            {selected.reservation_status_histories?.length ? selected.reservation_status_histories.map((h, i) => (
              <li key={`${h.created_at}-${i}`} className="relative"><span className="absolute -left-[22px] top-1.5 size-2.5 rounded-full bg-brand-700 ring-4 ring-white" /><StatusBadge status={h.new_status} /><p className="mt-1 text-xs text-muted">{formatDate(h.created_at)}{h.reason ? ` · ${h.reason}` : ''}</p></li>
            )) : <p className="text-sm text-muted">Belum ada riwayat.</p>}
          </ol>
        </Modal>
      )}

      {rejecting && (
        <Modal title="Tolak pengajuan" description="Alasan penolakan akan terlihat pada riwayat mahasiswa." onClose={() => setRejecting(null)} labelledBy="reject-title">
          <form onSubmit={(e) => { e.preventDefault(); if (rejectionReason.trim()) void changeStatus(rejecting, 'CANCELLED', rejectionReason); }} className="space-y-4">
            <Field label="Alasan penolakan"><textarea required minLength={3} value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className={cx(fieldClass, 'min-h-28')} placeholder="Tuliskan alasan yang jelas…" /></Field>
            <div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setRejecting(null)}>Batal</Button><Button type="submit" loading={working === rejecting.id} className="!bg-red-600 hover:!bg-red-700">{working === rejecting.id ? 'Memproses…' : 'Konfirmasi tolak'}</Button></div>
          </form>
        </Modal>
      )}
    </AppShell>
  );
};
