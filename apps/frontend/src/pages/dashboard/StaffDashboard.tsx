import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDownUp, Ban, CheckCircle2, ClipboardList, Clock, Eye, FileText, LayoutDashboard, RefreshCw, Search, Wallet, XCircle } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext.js';
import { reservationsService, type Reservation } from '../../services/reservations.service.js';
import { documentsService, type StudentDocument } from '../../services/documents.service.js';
import { occupancyService, type Assignment } from '../../services/occupancy.service.js';
import { paymentsService, type Invoice, type PaymentSummary } from '../../services/payments.service.js';
import { AppShell, type ShellNavItem } from '../../layouts/AppShell.js';
import { Alert, Button, Card, EmptyState, Field, Modal, Pagination, Spinner, StatusBadge, Td, Th, cx, fieldClass, formatDate } from '../../components/ui.js';
import { Drawer, MetricCard, Rise, Stepper, Tabs, Toast } from '../../components/motion.js';

const WAITING = ['SUBMITTED', 'PENDING_ACADEMIC_VERIFICATION', 'PENDING_DOCUMENTS'];
const APPROVED = ['ALLOCATED', 'CONFIRMED', 'COMPLETED'];
type SortKey = 'student' | 'date' | 'status';

const last7 = (list: Reservation[]) => {
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - i)); return d.getTime(); });
  return days.map((start) => list.filter((r) => { const t = new Date(r.submitted_at ?? r.created_at).getTime(); return t >= start && t < start + 86400000; }).length);
};
export const StaffDashboard: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Reservation[]>([]);
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [syncingInvoiceId, setSyncingInvoiceId] = useState<string | null>(null);
  const [staffError, setStaffError] = useState('');
  const [working, setWorking] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'date', dir: -1 });
  const pageSize = 8;
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [rejecting, setRejecting] = useState<Reservation | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvingReservation, setApprovingReservation] = useState<Reservation | null>(null);
  const [approvingDoc, setApprovingDoc] = useState<StudentDocument | null>(null);
  const [docApproveLoading, setDocApproveLoading] = useState(false);
  const [rejectingDoc, setRejectingDoc] = useState<StudentDocument | null>(null);
  const [docRejectReason, setDocRejectReason] = useState('');
  const [docSubmitting, setDocSubmitting] = useState(false);
  const [docError, setDocError] = useState('');
  const [checkoutModal, setCheckoutModal] = useState<{ id: string; status: string; title: string; promptNote?: boolean; required?: boolean } | null>(null);
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  const loadStaff = async () => {
    setLoading(true);
    setStaffError('');
    try {
      const [reservations, docs, occupancy, invoiceList, summary] = await Promise.all([
        reservationsService.all(),
        documentsService.all(),
        occupancyService.all(),
        paymentsService.adminList(),
        paymentsService.adminSummary(),
      ]);
      setItems(reservations);
      setDocuments(docs);
      setAssignments(occupancy);
      setInvoices(invoiceList);
      setPaymentSummary(summary);
    } catch (error) {
      setStaffError(error instanceof Error ? error.message : 'Data operasional tidak dapat dimuat.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void loadStaff(); }, []);

  const handleSyncInvoice = async (invoiceId: string) => {
    setSyncingInvoiceId(invoiceId);
    setStaffError('');
    try {
      const res = await paymentsService.syncInvoice(invoiceId);
      setNotice(res.message || 'Status pembayaran berhasil disinkronkan dengan Midtrans.');
      await loadStaff();
    } catch (error) {
      setStaffError(error instanceof Error ? error.message : 'Gagal menyinkronkan status dengan Midtrans.');
    } finally {
      setSyncingInvoiceId(null);
    }
  };
  const changeStatus = async (reservation: Reservation, status: string, reason?: string) => { setWorking(reservation.id); setStaffError(''); setNotice(''); try { await reservationsService.changeStatus(reservation.id, status, reason); setSelected(null); setRejecting(null); setRejectionReason(''); setApprovingReservation(null); setNotice(status === 'ALLOCATED' ? 'Pengajuan berhasil disetujui.' : 'Pengajuan berhasil ditolak.'); await loadStaff(); } catch (error) { setStaffError(error instanceof Error ? error.message : 'Status gagal diubah.'); } finally { setWorking(null); } };
  const approve = (reservation: Reservation) => setApprovingReservation(reservation);
  const submitApproveDoc = async () => {
    if (!approvingDoc) return;
    setDocApproveLoading(true);
    try {
      await documentsService.review(approvingDoc.id, 'APPROVED');
      setNotice(`Dokumen ${approvingDoc.document_type} berhasil disetujui.`);
      setApprovingDoc(null);
      await loadStaff();
    } catch (error) {
      setStaffError(error instanceof Error ? error.message : 'Verifikasi dokumen gagal.');
    } finally {
      setDocApproveLoading(false);
    }
  };
  const submitRejectDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingDoc) return;
    const reason = docRejectReason.trim();
    if (!reason) {
      setDocError('Alasan penolakan dokumen wajib diisi.');
      return;
    }
    setDocSubmitting(true);
    setDocError('');
    try {
      await documentsService.review(rejectingDoc.id, 'REJECTED', reason);
      setRejectingDoc(null);
      setDocRejectReason('');
      setNotice(`Dokumen ${rejectingDoc.document_type} berhasil ditolak.`);
      await loadStaff();
    } catch (error) {
      setDocError(error instanceof Error ? error.message : 'Penolakan dokumen gagal.');
    } finally {
      setDocSubmitting(false);
    }
  };
  const openDocument = async (document: StudentDocument) => { try { const url = await documentsService.openFile(document.id); window.open(url, '_blank', 'noopener,noreferrer'); setTimeout(() => URL.revokeObjectURL(url), 60_000); } catch (error) { setStaffError(error instanceof Error ? error.message : 'Dokumen tidak dapat dibuka.'); } };
  const checkIn = async (assignment: Assignment) => { try { await occupancyService.checkIn(assignment.id); setNotice('Check-in berhasil dicatat.'); await loadStaff(); } catch (error) { setStaffError(error instanceof Error ? error.message : 'Check-in gagal.'); } };
  const openCheckoutModal = (id: string, status: string) => {
    const title = status === 'REJECTED'
      ? 'Tolak Pengajuan Check-Out'
      : status === 'APPROVED'
      ? 'Setujui Permintaan Check-Out'
      : status === 'DEPARTED'
      ? 'Catat Mahasiswa Keluar Asrama'
      : 'Selesaikan Inspeksi Kamar';
    setCheckoutModal({ id, status, title, promptNote: true, required: status === 'REJECTED' });
    setCheckoutNotes('');
    setCheckoutError('');
  };
  const submitCheckoutAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutModal) return;
    if (checkoutModal.required && !checkoutNotes.trim()) {
      setCheckoutError('Catatan alasan penolakan wajib diisi.');
      return;
    }
    setCheckoutSubmitting(true);
    setCheckoutError('');
    try {
      await occupancyService.reviewCheckout(
        checkoutModal.id,
        checkoutModal.status,
        checkoutNotes.trim() || undefined,
        checkoutModal.status === 'VALIDATED' ? 'AVAILABLE' : undefined
      );
      setNotice('Proses check-out berhasil diperbarui.');
      setCheckoutModal(null);
      setCheckoutNotes('');
      await loadStaff();
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Proses check-out gagal.');
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  const cancelledByStaff = (item: Reservation) => item.status === 'CANCELLED' && !!item.reservation_status_histories?.some((h) => h.new_status === 'CANCELLED' && ['STAFF', 'ADMIN'].includes(h.users?.role ?? ''));
  const groups = useMemo(() => ({
    ALL: items,
    WAITING: items.filter((i) => WAITING.includes(i.status)),
    APPROVED: items.filter((i) => APPROVED.includes(i.status)),
    REJECTED: items.filter(cancelledByStaff),
    CANCELLED: items.filter((i) => i.status === 'CANCELLED' && !cancelledByStaff(i)),
  }), [items]);
  const tabItems = [{ id: 'ALL', label: 'Semua', count: groups.ALL.length }, { id: 'WAITING', label: 'Menunggu', count: groups.WAITING.length }, { id: 'APPROVED', label: 'Disetujui', count: groups.APPROVED.length }, { id: 'REJECTED', label: 'Ditolak', count: groups.REJECTED.length }, { id: 'CANCELLED', label: 'Dibatalkan', count: groups.CANCELLED.length }];

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (groups[tab as keyof typeof groups] ?? items).filter((item) => `${item.id} ${item.student_profiles?.full_name ?? ''} ${item.student_profiles?.nim ?? ''}`.toLowerCase().includes(q));
    const val = (r: Reservation) => sort.key === 'student' ? (r.student_profiles?.full_name ?? '') : sort.key === 'status' ? r.status : new Date(r.submitted_at ?? r.created_at).getTime();
    return [...list].sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * sort.dir; });
  }, [groups, items, tab, search, sort]);
  const pageCount = Math.max(1, Math.ceil(visibleItems.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageItems = visibleItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const roomLabel = (item: Reservation) => { const room = item.room_assignments?.[0]?.rooms; return room ? `${room.buildings.name} · ${room.room_number}` : 'Belum ada kamar'; };
  const toggleSort = (key: SortKey) => setSort((s) => s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 });
  const SortTh: React.FC<{ k: SortKey; children: React.ReactNode }> = ({ k, children }) => <Th><button type="button" onClick={() => toggleSort(k)} className={cx('inline-flex cursor-pointer items-center gap-1.5 uppercase tracking-wide transition hover:text-brand-700', sort.key === k && 'text-brand-700')}>{children}<ArrowDownUp className="size-3.5" /></button></Th>;

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
    { id: 'ringkasan', label: 'Ringkasan', icon: LayoutDashboard, group: 'Operasional' },
    { id: 'pengajuan', label: 'Pengajuan Reservasi', icon: ClipboardList, group: 'Operasional', badge: groups.WAITING.length },
    { id: 'dokumen', label: 'Verifikasi Dokumen', icon: CheckCircle2, group: 'Operasional', badge: documents.filter((item) => item.status === 'PENDING').length },
    { id: 'pembayaran', label: 'Monitoring Pembayaran', icon: Wallet, group: 'Operasional', badge: invoices.filter((i) => i.status === 'ISSUED').length },
    { id: 'hunian', label: 'Check-in / Check-out', icon: Clock, group: 'Operasional' },
  ];

  return (
    <AppShell roleLabel="Staff Operasional" title="Semua Reservasi" nav={nav}>
      <AnimatePresence>{notice && <Toast message={notice} onClose={() => setNotice('')} />}</AnimatePresence>

      <section id="ringkasan" className="scroll-mt-24 space-y-6">
        <Rise><h2 className="text-2xl font-extrabold tracking-tight text-ink">Halo, {user?.email}</h2><p className="mt-1 text-sm text-muted">ID Pegawai: {user?.staffProfile?.employeeIdentifier || 'Petugas Asrama'} · Hak akses: memproses pengajuan reservasi. Pengelolaan akun, gedung, dan kamar khusus ADMIN.</p></Rise>
        {staffError && <Alert tone="error">{staffError}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Total pengajuan" value={groups.ALL.length} icon={ClipboardList} tone="brand" spark={last7(groups.ALL)} hint="7 hari terakhir" delay={0} />
          <MetricCard label="Menunggu diproses" value={groups.WAITING.length} icon={Clock} tone="accent" spark={last7(groups.WAITING)} delay={0.06} />
          <MetricCard label="Disetujui" value={groups.APPROVED.length} icon={CheckCircle2} tone="emerald" spark={last7(groups.APPROVED)} delay={0.12} />
          <MetricCard label="Ditolak" value={groups.REJECTED.length} icon={XCircle} tone="violet" spark={last7(groups.REJECTED)} delay={0.18} />
          <MetricCard label="Dibatalkan" value={groups.CANCELLED.length} icon={Ban} tone="brand" spark={last7(groups.CANCELLED)} delay={0.24} />
        </div>
      </section>

      <section id="dokumen" className="scroll-mt-24 space-y-4">
        <Rise inView>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-ink">Verifikasi dokumen mahasiswa</h2>
              <p className="text-sm text-muted">Periksa keabsahan KTP/KTM mahasiswa untuk kelengkapan berkas asrama.</p>
            </div>
            <span className="rounded-full bg-accent-50 px-3 py-1 text-xs font-bold text-accent-600">
              {documents.filter((d) => d.status === 'PENDING').length} menunggu
            </span>
          </div>
        </Rise>
        <Card className="divide-y divide-line">
          {loading ? (
            <Spinner label="Memuat dokumen…" />
          ) : documents.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Tidak ada dokumen" description="Belum ada dokumen KTP/KTM yang diunggah oleh mahasiswa." />
          ) : (
            documents.map((document) => {
              const studentName = document.users_student_documents_user_idTousers?.student_profiles?.full_name ?? document.users_student_documents_user_idTousers?.email ?? 'Mahasiswa';
              const studentNim = document.users_student_documents_user_idTousers?.student_profiles?.nim;
              return (
                <div key={document.id} className="flex flex-wrap items-center justify-between gap-4 p-4 transition-colors hover:bg-slate-50/50">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                      <FileText className="size-5" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-ink">{studentName}</p>
                        {studentNim && <span className="text-xs text-muted">({studentNim})</span>}
                        <span className="rounded bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-800">{document.document_type}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted">
                        Diunggah: {formatDate(document.uploaded_at)}
                        {document.rejection_reason && (
                          <span className="ml-2 font-medium text-red-600">· Alasan ditolak: {document.rejection_reason}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => void openDocument(document)} title="Buka file dokumen">
                      <Eye className="size-4" />
                      Lihat Dokumen
                    </Button>
                    <StatusBadge status={document.status} />
                    {document.status === 'PENDING' && (
                      <>
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => setApprovingDoc(document)}
                        >
                          Setujui
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            setRejectingDoc(document);
                            setDocRejectReason('');
                            setDocError('');
                          }}
                        >
                          Tolak
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </Card>
      </section>

      <section id="pembayaran" className="scroll-mt-24 space-y-4">
        <Rise inView>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-ink">Monitoring Pembayaran Asrama</h2>
              <p className="text-sm text-muted">Pemantauan transaksi tagihan mahasiswa via Midtrans Sandbox.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                {paymentSummary?.paidInvoices ?? 0} Lunas
              </span>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                {paymentSummary?.pendingInvoices ?? 0} Menunggu
              </span>
            </div>
          </div>
        </Rise>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs font-semibold text-muted">Total Tagihan</p>
            <p className="mt-1 text-2xl font-extrabold text-ink">{paymentSummary?.totalInvoices ?? invoices.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold text-muted">Total Pembayaran Lunas</p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-600">{paymentSummary?.paidInvoices ?? 0}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold text-muted">Menunggu Pembayaran</p>
            <p className="mt-1 text-2xl font-extrabold text-amber-600">{paymentSummary?.pendingInvoices ?? 0}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold text-muted">Penerimaan Tercatat</p>
            <p className="mt-1 text-xl font-extrabold text-brand-700">
              Rp {(paymentSummary?.totalPaidAmount ?? 0).toLocaleString('id-ID')}
            </p>
          </Card>
        </div>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-56 flex-1 sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <input
                  aria-label="Cari pembayaran"
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  placeholder="Cari mahasiswa, NIM, atau invoice…"
                  className={cx(fieldClass, 'pl-10')}
                />
              </div>
              <select
                aria-label="Filter status tagihan"
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className={cx(fieldClass, '!w-auto font-semibold')}
              >
                <option value="ALL">Semua Status</option>
                <option value="ISSUED">Menunggu Pembayaran (ISSUED)</option>
                <option value="PAID">Lunas (PAID)</option>
                <option value="EXPIRED">Kedaluwarsa (EXPIRED)</option>
                <option value="CANCELLED">Dibatalkan (CANCELLED)</option>
              </select>
            </div>
            <Button variant="secondary" onClick={() => void loadStaff()} disabled={loading} size="sm">
              <RefreshCw className={cx('size-3.5', loading && 'animate-spin')} />
              Segarkan Data
            </Button>
          </div>

          {filteredInvoices.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="Tidak ada data pembayaran"
              description="Tidak ditemukan tagihan yang sesuai dengan pencarian atau filter status."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-canvas">
                  <tr>
                    <Th>No. Invoice</Th>
                    <Th>Mahasiswa</Th>
                    <Th>Kamar / Asrama</Th>
                    <Th>Nominal</Th>
                    <Th>Status Tagihan</Th>
                    <Th>Gateway Midtrans</Th>
                    <Th>Tanggal</Th>
                    <Th className="text-right">Aksi</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredInvoices.map((inv) => {
                    const student = inv.reservations?.student_profiles;
                    const room = inv.reservations?.room_assignments?.[0]?.rooms;
                    const latestPay = inv.payments?.[0];
                    return (
                      <tr key={inv.id} className="transition-colors hover:bg-brand-50/40">
                        <Td className="font-mono text-xs font-bold text-brand-700">
                          {inv.invoice_number}
                        </Td>
                        <Td>
                          <p className="font-semibold text-ink">{student?.full_name ?? '—'}</p>
                          <p className="text-xs text-muted">{student?.nim ?? '—'}</p>
                        </Td>
                        <Td className="text-sm text-ink">
                          {room ? `${room.buildings.name} · ${room.room_number}` : 'Kamar Asrama'}
                        </Td>
                        <Td className="font-bold text-ink">
                          Rp {Number(inv.amount).toLocaleString('id-ID')}
                        </Td>
                        <Td>
                          <StatusBadge status={inv.status} />
                        </Td>
                        <Td>
                          {latestPay ? (
                            <span className={cx(
                              'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold',
                              latestPay.status === 'SUCCEEDED' ? 'bg-emerald-50 text-emerald-700' :
                              latestPay.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                              'bg-rose-50 text-rose-700'
                            )}>
                              {latestPay.provider_name || 'MIDTRANS'} · {latestPay.status}
                            </span>
                          ) : (
                            <span className="text-xs text-muted">Belum ada percobaan</span>
                          )}
                        </Td>
                        <Td className="text-xs text-muted">
                          {formatDate(inv.issued_at)}
                        </Td>
                        <Td className="text-right">
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
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      <section id="hunian" className="scroll-mt-24 space-y-4"><Rise inView><h2 className="text-lg font-bold text-ink">Operasional hunian</h2></Rise><Card className="divide-y divide-line">{assignments.length === 0 ? <EmptyState icon={Clock} title="Tidak ada alokasi aktif" /> : assignments.map((assignment) => { const request = assignment.check_out_requests[0]; return <div key={assignment.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-semibold text-ink">{assignment.reservations.student_profiles.full_name} · {assignment.rooms.buildings.name} / {assignment.rooms.room_number}</p><p className="text-sm text-muted">{assignment.check_ins ? 'Sudah check-in' : 'Siap check-in'}{request ? ` · Check-out: ${request.status}` : ''}</p></div><div className="flex gap-2">{assignment.status === 'RESERVED' && <Button size="sm" onClick={() => void checkIn(assignment)}>Check-in</Button>}{request?.status === 'REQUESTED' && <><Button size="sm" variant="success" onClick={() => openCheckoutModal(request.id, 'APPROVED')}>Setujui keluar</Button><Button size="sm" variant="danger" onClick={() => openCheckoutModal(request.id, 'REJECTED')}>Tolak</Button></>}{request?.status === 'APPROVED' && <Button size="sm" onClick={() => openCheckoutModal(request.id, 'DEPARTED')}>Catat keluar</Button>}{request?.status === 'DEPARTED' && <Button size="sm" variant="success" onClick={() => openCheckoutModal(request.id, 'VALIDATED')}>Selesaikan inspeksi</Button>}</div></div>; })}</Card></section>

      <section id="pengajuan" className="scroll-mt-24 space-y-4">
        <Rise inView><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-bold tracking-tight text-ink">Daftar reservasi</h2><p className="mt-0.5 text-sm text-muted">Tinjau detail mahasiswa dan proses pengajuan yang masuk.</p></div><Tabs id="staff" items={tabItems} value={tab} onChange={(v) => { setTab(v); setPage(1); }} /></div></Rise>
        <Card>
          <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
            <div className="relative min-w-56 flex-1 sm:max-w-sm"><Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" /><input aria-label="Cari pengajuan" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Cari nama, NIM, atau kode" className={cx(fieldClass, 'pl-10')} /></div>
            <Button variant="secondary" onClick={() => void loadStaff()} disabled={loading} className="ml-auto"><RefreshCw className={cx('size-4', loading && 'animate-spin')} />Muat ulang</Button>
          </div>
          {loading ? <Spinner label="Memuat pengajuan…" /> : visibleItems.length === 0 ? <EmptyState icon={ClipboardList} title="Tidak ada pengajuan" description="Tidak ada data yang cocok dengan pencarian atau filter." /> : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                  <thead className="bg-canvas"><tr><Th>Kode</Th><SortTh k="student">Mahasiswa</SortTh><Th>Asrama & kamar</Th><SortTh k="date">Tanggal pengajuan</SortTh><SortTh k="status">Status</SortTh><Th className="text-right">Tindakan</Th></tr></thead>
                  <tbody className="divide-y divide-line">
                    <AnimatePresence mode="popLayout" initial={false}>
                      {pageItems.map((item, i) => (
                        <motion.tr key={item.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.03, duration: 0.3 }} onClick={() => setSelected(item)} className="cursor-pointer transition-colors hover:bg-brand-50/50">
                          <Td className="font-mono text-xs font-bold text-brand-700">{item.id.slice(0, 8).toUpperCase()}</Td>
                          <Td><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">{(item.student_profiles?.full_name ?? '?').charAt(0)}</span><div><p className="font-semibold text-ink">{item.student_profiles?.full_name ?? '—'}</p><p className="text-xs text-muted">{item.student_profiles?.nim ?? '—'}</p></div></div></Td>
                          <Td className="text-ink">{roomLabel(item)}</Td>
                          <Td className="text-muted">{formatDate(item.submitted_at ?? item.created_at)}</Td>
                          <Td><StatusBadge status={item.status} /></Td>
                          <Td><div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button variant="secondary" size="sm" onClick={() => setSelected(item)}>Detail</Button>
                            {item.status === 'SUBMITTED' && <><Button variant="success" size="sm" disabled={working === item.id} onClick={() => approve(item)}>Setujui</Button><Button variant="danger" size="sm" disabled={working === item.id} onClick={() => { setRejecting(item); setRejectionReason(''); }}>Tolak</Button></>}
                          </div></Td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
              <Pagination page={currentPage} pageCount={pageCount} total={visibleItems.length} onChange={setPage} />
            </>
          )}
        </Card>
      </section>

      <Drawer open={!!selected} title="Detail pengajuan" subtitle={selected?.id} onClose={() => setSelected(null)}>
        {selected && (
          <div className="space-y-6">
            <div className="flex items-center gap-4"><span className="grid size-14 place-items-center rounded-full bg-brand-700 text-xl font-bold text-white">{(selected.student_profiles?.full_name ?? '?').charAt(0)}</span><div><p className="text-lg font-bold text-ink">{selected.student_profiles?.full_name ?? '—'}</p><p className="text-sm text-muted">NIM {selected.student_profiles?.nim ?? '—'}</p></div><div className="ml-auto"><StatusBadge status={selected.status} /></div></div>
            <div className="rounded-2xl bg-canvas p-4"><Stepper status={selected.status} /></div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">{[['Kamar', roomLabel(selected)], ['Periode', selected.academic_periods?.name ?? '—'], ['Diajukan', formatDate(selected.submitted_at ?? selected.created_at)]].map(([k, v]) => <div key={k} className="rounded-xl border border-line p-3.5"><dt className="text-xs text-muted">{k}</dt><dd className="mt-1 font-bold text-ink">{v}</dd></div>)}</dl>
            {(() => {
              const resInvoice = invoices.find((inv) => inv.reservation_id === selected.id);
              if (!resInvoice) return null;
              const latestPay = resInvoice.payments?.[0];
              return (
                <div className="rounded-xl border border-line bg-canvas p-4 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink text-sm">Status Pembayaran Asrama</span>
                    <StatusBadge status={resInvoice.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-muted">
                    <p>No. Invoice: <span className="font-mono font-bold text-brand-700">{resInvoice.invoice_number}</span></p>
                    <p>Nominal: <span className="font-bold text-ink">Rp {Number(resInvoice.amount).toLocaleString('id-ID')}</span></p>
                    <p>Gateway: <span className="font-semibold text-ink">{latestPay?.provider_name || 'MIDTRANS'} ({latestPay?.status || 'PENDING'})</span></p>
                    <p>Diterbitkan: <span className="font-medium text-ink">{formatDate(resInvoice.issued_at)}</span></p>
                  </div>
                  {resInvoice.status !== 'PAID' && (
                    <div className="flex justify-end pt-1">
                      <Button
                        size="sm"
                        variant="accent"
                        loading={syncingInvoiceId === resInvoice.id}
                        onClick={() => void handleSyncInvoice(resInvoice.id)}
                      >
                        <RefreshCw className={cx('size-3.5', syncingInvoiceId === resInvoice.id && 'animate-spin')} />
                        Cek & Sinkronkan Midtrans
                      </Button>
                    </div>
                  )}
                </div>
              );
            })()}
            <div><h3 className="text-sm font-bold text-ink">Riwayat status</h3>
              <ol className="mt-3 space-y-4 border-l-2 border-brand-100 pl-4">
                {selected.reservation_status_histories?.length ? selected.reservation_status_histories.map((h, i) => (
                  <motion.li key={`${h.created_at}-${i}`} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.07 }} className="relative"><span className="absolute -left-[22px] top-1.5 size-2.5 rounded-full bg-brand-700 ring-4 ring-white" /><StatusBadge status={h.new_status} /><p className="mt-1 text-xs text-muted">{formatDate(h.created_at)}{h.reason ? ` · ${h.reason}` : ''}</p></motion.li>
                )) : <p className="text-sm text-muted">Belum ada riwayat.</p>}
              </ol>
            </div>
            {selected.status === 'SUBMITTED' && <div className="flex gap-3 border-t border-line pt-5"><Button variant="success" className="flex-1" disabled={working === selected.id} onClick={() => approve(selected)}>Setujui</Button><Button variant="danger" className="flex-1" disabled={working === selected.id} onClick={() => { setRejecting(selected); setRejectionReason(''); }}>Tolak</Button></div>}
          </div>
        )}
      </Drawer>

      {/* Modal Persetujuan Pengajuan Reservasi */}
      {approvingReservation && (
        <Modal
          title="Setujui Pengajuan Reservasi"
          description="Konfirmasi alokasi kamar untuk pengajuan mahasiswa ini."
          onClose={() => setApprovingReservation(null)}
          labelledBy="approve-res-title"
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-canvas p-4 text-xs text-muted">
              <p className="font-semibold text-ink text-sm">
                {approvingReservation.student_profiles?.full_name ?? 'Mahasiswa'}
                {approvingReservation.student_profiles?.nim ? ` (${approvingReservation.student_profiles.nim})` : ''}
              </p>
              <p className="mt-1">
                Kode Pengajuan: <span className="font-mono font-bold text-brand-700">{approvingReservation.id.slice(0, 8).toUpperCase()}</span>
              </p>
              <p className="mt-0.5">
                Kamar: <span className="font-medium text-ink">{roomLabel(approvingReservation)}</span>
              </p>
            </div>
            <p className="text-sm text-ink">
              Apakah Anda yakin ingin menyetujui pengajuan ini? Status reservasi akan berubah menjadi <strong>ALLOCATED</strong>.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setApprovingReservation(null)}>
                Batal
              </Button>
              <Button
                variant="success"
                loading={working === approvingReservation.id}
                onClick={() => void changeStatus(approvingReservation, 'ALLOCATED')}
              >
                {working === approvingReservation.id ? 'Memproses…' : 'Ya, Setujui Pengajuan'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Persetujuan Dokumen KTP/KTM */}
      {approvingDoc && (
        <Modal
          title={`Setujui Dokumen ${approvingDoc.document_type}`}
          description="Pastikan berkas dokumen mahasiswa telah diverifikasi dengan benar."
          onClose={() => { if (!docApproveLoading) setApprovingDoc(null); }}
          labelledBy="approve-doc-title"
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-canvas p-4 text-xs text-muted">
              <p className="font-semibold text-ink text-sm">
                {approvingDoc.users_student_documents_user_idTousers?.student_profiles?.full_name ?? 'Mahasiswa'}
                {approvingDoc.users_student_documents_user_idTousers?.student_profiles?.nim ? ` (${approvingDoc.users_student_documents_user_idTousers.student_profiles.nim})` : ''}
              </p>
              <p className="mt-1">
                Jenis Dokumen: <span className="font-bold text-brand-700">{approvingDoc.document_type}</span>
              </p>
              <p className="mt-0.5">
                Waktu Unggah: <span className="font-medium text-ink">{formatDate(approvingDoc.uploaded_at)}</span>
              </p>
            </div>
            <p className="text-sm text-ink">
              Apakah Anda mengonfirmasi bahwa dokumen <strong>{approvingDoc.document_type}</strong> ini telah valid dan memenuhi persyaratan?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                disabled={docApproveLoading}
                onClick={() => setApprovingDoc(null)}
              >
                Batal
              </Button>
              <Button
                variant="success"
                loading={docApproveLoading}
                onClick={() => void submitApproveDoc()}
              >
                {docApproveLoading ? 'Memproses…' : 'Ya, Setujui Dokumen'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Penolakan Reservasi */}
      {rejecting && (
        <Modal title="Tolak pengajuan" description="Alasan penolakan akan terlihat pada riwayat mahasiswa." onClose={() => setRejecting(null)} labelledBy="reject-title">
          <form onSubmit={(e) => { e.preventDefault(); if (rejectionReason.trim()) void changeStatus(rejecting, 'CANCELLED', rejectionReason); }} className="space-y-4">
            <Field label="Alasan penolakan"><textarea required minLength={3} value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className={cx(fieldClass, 'min-h-28')} placeholder="Tuliskan alasan yang jelas…" /></Field>
            <div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setRejecting(null)}>Batal</Button><Button type="submit" loading={working === rejecting.id} className="!bg-red-600 hover:!bg-red-700 text-white">{working === rejecting.id ? 'Memproses…' : 'Konfirmasi tolak'}</Button></div>
          </form>
        </Modal>
      )}

      {/* Modal Penolakan Dokumen KTP/KTM */}
      {rejectingDoc && (
        <Modal
          title={`Tolak Dokumen ${rejectingDoc.document_type}`}
          description="Alasan penolakan wajib diisi dan akan disampaikan kepada mahasiswa untuk proses perbaikan berkas."
          onClose={() => { if (!docSubmitting) setRejectingDoc(null); }}
          labelledBy="reject-doc-title"
        >
          <form onSubmit={submitRejectDoc} className="space-y-4">
            <div className="rounded-xl border border-line bg-canvas p-3.5 text-xs text-muted">
              <p className="font-semibold text-ink">
                {rejectingDoc.users_student_documents_user_idTousers?.student_profiles?.full_name ?? 'Mahasiswa'}
                {rejectingDoc.users_student_documents_user_idTousers?.student_profiles?.nim ? ` (${rejectingDoc.users_student_documents_user_idTousers.student_profiles.nim})` : ''}
              </p>
              <p className="mt-1">
                Jenis Dokumen: <span className="font-bold text-brand-700">{rejectingDoc.document_type}</span>
              </p>
            </div>

            {docError && <Alert tone="error">{docError}</Alert>}

            <Field label="Alasan penolakan dokumen (wajib diisi)">
              <textarea
                required
                rows={3}
                value={docRejectReason}
                onChange={(e) => {
                  setDocRejectReason(e.target.value);
                  if (docError) setDocError('');
                }}
                placeholder="Contoh: Foto dokumen buram dan data identitas/NIM tidak terbaca jelas. Mohon unggah ulang foto yang jelas dan terang."
                className={cx(fieldClass, 'min-h-24 resize-y')}
              />
            </Field>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                disabled={docSubmitting}
                onClick={() => setRejectingDoc(null)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                loading={docSubmitting}
                className="!bg-red-600 hover:!bg-red-700 text-white"
              >
                {docSubmitting ? 'Memproses…' : 'Konfirmasi Penolakan'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Check-out Operasional Hunian */}
      {checkoutModal && (
        <Modal
          title={checkoutModal.title}
          description="Catat keterangan pemeriksaan dan proses status keluar asrama mahasiswa."
          onClose={() => { if (!checkoutSubmitting) setCheckoutModal(null); }}
          labelledBy="checkout-modal-title"
        >
          <form onSubmit={submitCheckoutAction} className="space-y-4">
            {checkoutError && <Alert tone="error">{checkoutError}</Alert>}

            <Field label={checkoutModal.required ? 'Alasan penolakan (wajib diisi)' : 'Catatan pemeriksaan / keterangan (opsional)'}>
              <textarea
                rows={3}
                required={checkoutModal.required}
                value={checkoutNotes}
                onChange={(e) => {
                  setCheckoutNotes(e.target.value);
                  if (checkoutError) setCheckoutError('');
                }}
                placeholder={checkoutModal.required ? 'Contoh: Masih ada tunggakan atau kunci kamar belum dikembalikan…' : 'Catatan kondisi fasilitas kamar saat ditinggalkan…'}
                className={cx(fieldClass, 'min-h-24 resize-y')}
              />
            </Field>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                disabled={checkoutSubmitting}
                onClick={() => setCheckoutModal(null)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant={checkoutModal.status === 'REJECTED' ? 'danger' : 'primary'}
                loading={checkoutSubmitting}
              >
                {checkoutSubmitting ? 'Memproses…' : 'Konfirmasi'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </AppShell>
  );
};
// Staff dashboard component.
