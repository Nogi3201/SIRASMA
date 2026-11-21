import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, BedDouble, CheckCircle2, ClipboardList, Clock, Heart, LayoutDashboard, Search, ShieldCheck, Sparkles, UserRound, Users, Wallet } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext.js';
import { managementService, type Room } from '../../services/management.service.js';
import { reservationsService, type Reservation } from '../../services/reservations.service.js';
import { profileService } from '../../services/auth-admin.service.js';
import { documentsService, type StudentDocument } from '../../services/documents.service.js';
import { occupancyService, type Assignment } from '../../services/occupancy.service.js';
import { paymentsService, type Invoice, loadSnapScript } from '../../services/payments.service.js';
import { AppShell, type ShellNavItem } from '../../layouts/AppShell.js';
import { Alert, Button, Card, EmptyState, Field, Modal, SectionHeader, StatusBadge, cx, fieldClass } from '../../components/ui.js';
import { MetricCard, Rise, Stepper, Tabs, Toast } from '../../components/motion.js';

const PROCESSING = ['SUBMITTED', 'PENDING_ACADEMIC_VERIFICATION', 'PENDING_DOCUMENTS', 'PENDING_PAYMENT'];
const APPROVED = ['ALLOCATED', 'CONFIRMED', 'COMPLETED'];
const CANCELLABLE = ['SUBMITTED', 'PENDING_ACADEMIC_VERIFICATION', 'PENDING_DOCUMENTS'];
const FAV_KEY = 'sirasma:favorite-rooms';

const readFavorites = (): string[] => { try { const v = JSON.parse(localStorage.getItem(FAV_KEY) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const money = (r?: { amount: string; currency: string }) => r ? `${r.currency} ${Number(r.amount).toLocaleString('id-ID')}` : null;

const HeroPhoto: React.FC = () => {
  const [ok, setOk] = useState(true);
  return ok ? <motion.img src="/images/ulbi/galeri-1.jpg" alt="" onError={() => setOk(false)} initial={{ scale: 1.12 }} animate={{ scale: 1 }} transition={{ duration: 8, ease: 'easeOut' }} className="absolute inset-0 size-full object-cover" /> : null;
};

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [generatingInvoiceFor, setGeneratingInvoiceFor] = useState<string | null>(null);
  const [studentError, setStudentError] = useState('');
  const [studentNotice, setStudentNotice] = useState('');
  const [submittingRoom, setSubmittingRoom] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogBuilding, setCatalogBuilding] = useState('ALL');
  const [sortBy, setSortBy] = useState('default');
  const [onlyFav, setOnlyFav] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(readFavorites);
  const [detail, setDetail] = useState<Room | null>(null);
  const [detailTab, setDetailTab] = useState('ringkasan');
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({ fullName: user?.studentProfile?.fullName ?? '', studyProgram: user?.studentProfile?.studyProgram ?? '', activeSemester: String(user?.studentProfile?.activeSemester ?? '') });

  const loadStudent = async () => {
    try {
      const [roomData, reservationData, documentData, assignmentData, invoiceData] = await Promise.all([
        managementService.rooms(true),
        reservationsService.mine(),
        documentsService.mine(),
        occupancyService.mine(),
        paymentsService.myInvoices(),
      ]);
      setRooms(roomData);
      setReservations(reservationData);
      setDocuments(documentData);
      setAssignments(assignmentData);
      setInvoices(invoiceData);
    } catch (error) {
      setStudentError(error instanceof Error ? error.message : 'Data tidak dapat dimuat.');
    }
  };
  useEffect(() => { void loadStudent(); }, []);

  const payInvoice = async (invoice: Invoice) => {
    setPayingInvoiceId(invoice.id);
    setStudentError('');
    try {
      await loadSnapScript(import.meta.env.VITE_MIDTRANS_CLIENT_KEY);
      const snapData = await paymentsService.createSnapToken(invoice.id);

      if (window.snap) {
        window.snap.pay(snapData.token, {
          onSuccess: async () => {
            setStudentNotice('Pembayaran berhasil! Mengonfirmasi status dengan server Midtrans...');
            try {
              await paymentsService.syncInvoice(invoice.id);
              setStudentNotice('Pembayaran berhasil dikonfirmasi! Pengajuan reservasi Anda resmi disetujui (CONFIRMED).');
            } catch {
              setStudentNotice('Pembayaran berhasil via Midtrans! Memperbarui data...');
            }
            await loadStudent();
          },
          onPending: async () => {
            setStudentNotice('Transaksi sedang diproses oleh Midtrans. Silakan selesaikan pembayaran.');
            try {
              await paymentsService.syncInvoice(invoice.id);
            } catch {
              /* didukung oleh webhook */
            }
            await loadStudent();
          },
          onError: (err: any) => {
            setStudentError(err?.message || 'Pembayaran gagal diproses oleh Midtrans.');
            void loadStudent();
          },
          onClose: async () => {
            try {
              await paymentsService.syncInvoice(invoice.id);
            } catch {
              /* didukung oleh webhook */
            }
            await loadStudent();
          },
        });
      } else if (snapData.redirectUrl) {
        window.open(snapData.redirectUrl, '_blank');
      }
    } catch (error) {
      setStudentError(error instanceof Error ? error.message : 'Gagal membuka layanan pembayaran Midtrans.');
    } finally {
      setPayingInvoiceId(null);
    }
  };

  const createInvoice = async (reservationId: string) => {
    setGeneratingInvoiceFor(reservationId);
    setStudentError('');
    try {
      const inv = await paymentsService.createInvoice(reservationId);
      setStudentNotice('Tagihan pembayaran berhasil diterbitkan.');
      await loadStudent();
      await payInvoice(inv);
    } catch (error) {
      setStudentError(error instanceof Error ? error.message : 'Gagal menerbitkan tagihan.');
    } finally {
      setGeneratingInvoiceFor(null);
    }
  };
  const reserve = async (roomId: string) => { setSubmittingRoom(roomId); setStudentError(''); try { await reservationsService.create(roomId); setDetail(null); setStudentNotice('Pengajuan reservasi berhasil dikirim.'); await loadStudent(); } catch (error) { setStudentError(error instanceof Error ? error.message : 'Pengajuan gagal dibuat.'); setDetail(null); } finally { setSubmittingRoom(null); } };
  const cancelReservation = async (id: string) => { const reason = window.prompt('Alasan pembatalan pengajuan:'); if (!reason?.trim()) return; try { await reservationsService.cancel(id, reason); setStudentNotice('Pengajuan dibatalkan.'); await loadStudent(); } catch (error) { setStudentError(error instanceof Error ? error.message : 'Pembatalan gagal.'); } };
  const updateProfile = async (event: React.FormEvent) => { event.preventDefault(); setProfileSaving(true); setStudentError(''); try { await profileService.updateStudent({ fullName: profileForm.fullName, studyProgram: profileForm.studyProgram, activeSemester: Number(profileForm.activeSemester) }); setStudentNotice('Profil berhasil diperbarui. Muat ulang halaman untuk memperbarui sapaan.'); setProfileOpen(false); } catch (error) { setStudentError(error instanceof Error ? error.message : 'Profil gagal diperbarui.'); } finally { setProfileSaving(false); } };
  const toggleFavorite = (id: string) => setFavorites((prev) => { const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]; try { localStorage.setItem(FAV_KEY, JSON.stringify(next)); } catch { /* penyimpanan tidak tersedia */ } return next; });
  const uploadDocument = async (kind: 'KTP' | 'KTM', file?: File) => { if (!file) return; if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type) || file.size > 5 * 1024 * 1024) { setStudentError('Gunakan JPG, PNG, atau PDF maksimal 5 MB.'); return; } try { const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); }); await documentsService.upload(kind, file.name, data); setStudentNotice(`${kind} berhasil diunggah dan menunggu verifikasi.`); await loadStudent(); } catch (error) { setStudentError(error instanceof Error ? error.message : 'Unggah dokumen gagal.'); } };
  const requestCheckout = async (assignment: Assignment) => { const reason = window.prompt('Alasan check-out (opsional):'); try { await occupancyService.requestCheckout(assignment.id, reason ?? undefined); setStudentNotice('Permintaan check-out berhasil dikirim.'); await loadStudent(); } catch (error) { setStudentError(error instanceof Error ? error.message : 'Pengajuan check-out gagal.'); } };

  const buildings = [...new Set(rooms.map((room) => room.buildings.name))];
  const filteredRooms = useMemo(() => {
    const list = rooms.filter((room) => (catalogBuilding === 'ALL' || room.buildings.name === catalogBuilding) && (!onlyFav || favorites.includes(room.id)) && `${room.buildings.name} ${room.room_number} ${room.description ?? ''} ${room.room_facilities.map((f) => f.facilities.name).join(' ')}`.toLowerCase().includes(catalogSearch.toLowerCase()));
    const rate = (r: Room) => Number(r.room_rates[0]?.amount ?? Number.MAX_SAFE_INTEGER);
    if (sortBy === 'price-asc') return [...list].sort((a, b) => rate(a) - rate(b));
    if (sortBy === 'price-desc') return [...list].sort((a, b) => (b.room_rates[0] ? rate(b) : -1) - (a.room_rates[0] ? rate(a) : -1));
    if (sortBy === 'capacity') return [...list].sort((a, b) => b.capacity - a.capacity);
    return list;
  }, [rooms, catalogBuilding, catalogSearch, sortBy, onlyFav, favorites]);
  const stats = { total: reservations.length, processing: reservations.filter((i) => PROCESSING.includes(i.status)).length, approved: reservations.filter((i) => APPROVED.includes(i.status)).length };
  const latest = [...reservations].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0];
  const roomOf = (r: Reservation) => r.room_assignments?.[0] ? `${r.room_assignments[0].rooms.buildings.name} · Kamar ${r.room_assignments[0].rooms.room_number}` : r.academic_periods?.name ?? 'Reservasi';
  const buildingTabs = [{ id: 'ALL', label: 'Semua asrama', count: rooms.length }, ...buildings.map((b) => ({ id: b, label: b, count: rooms.filter((r) => r.buildings.name === b).length }))];
  const openDetail = (room: Room) => { setDetailTab('ringkasan'); setDetail(room); };

  const pendingInvoices = invoices.filter((i) => i.status === 'ISSUED');

  const nav: ShellNavItem[] = [
    { id: 'ringkasan', label: 'Ringkasan', icon: LayoutDashboard, group: 'Beranda' },
    { id: 'reservasi', label: 'Reservasi Saya', icon: ClipboardList, group: 'Beranda', badge: stats.processing },
    { id: 'dokumen', label: 'Dokumen', icon: ShieldCheck, group: 'Beranda' },
    { id: 'pembayaran', label: 'Pembayaran Asrama', icon: Wallet, group: 'Beranda', badge: pendingInvoices.length },
    { id: 'hunian', label: 'Check-in / Check-out', icon: BedDouble, group: 'Hunian' },
    { id: 'katalog', label: 'Katalog Kamar', icon: BedDouble, group: 'Hunian' },
    { id: 'profil', label: 'Profil', icon: UserRound, group: 'Akun', onClick: () => setProfileOpen(true) },
  ];

  return (
    <AppShell roleLabel="Portal Mahasiswa" title="Portal Mahasiswa" nav={nav}>
      <AnimatePresence>{studentNotice && <Toast message={studentNotice} onClose={() => setStudentNotice('')} />}</AnimatePresence>
      {studentError && <Alert tone="error">{studentError}</Alert>}

      <section id="ringkasan" className="scroll-mt-24 space-y-6">
        <Rise><div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 text-white shadow-pop">
          <HeroPhoto />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-900/95 via-brand-800/80 to-brand-900/40" />
          <div className="animate-float pointer-events-none absolute -right-10 -top-10 size-56 rounded-full bg-accent-500/30 blur-3xl" />
          <div className="relative grid gap-8 p-6 sm:p-9 lg:grid-cols-[1.3fr_1fr] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[.14em] text-orange-100 ring-1 ring-white/20"><Sparkles className="size-3.5" />Selamat datang</p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">{user?.studentProfile?.fullName || user?.email}</h2>
              <p className="mt-1 text-sm text-brand-200">{user?.email}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[['NIM', user?.studentProfile?.nim || '-'], ['Program Studi', user?.studentProfile?.studyProgram || '-'], ['Verifikasi', user?.studentProfile?.academicStatus || 'PENDING']].map(([k, v], i) => (
                  <motion.div key={k} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className="rounded-xl bg-white/10 p-3.5 ring-1 ring-white/15 backdrop-blur"><p className="text-[11px] font-semibold uppercase tracking-wide text-brand-200">{k}</p><p className="mt-1 truncate text-sm font-bold">{v}</p></motion.div>
                ))}
              </div>
            </div>
            <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4, duration: 0.6 }} className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-xl">
              <p className="text-xs font-bold uppercase tracking-[.14em] text-orange-100">Pengajuan terbaru</p>
              {latest ? (
                <><p className="mt-2 text-lg font-bold">{roomOf(latest)}</p><div className="mt-1"><StatusBadge status={latest.status} /></div><div className="mt-5"><Stepper status={latest.status} dark /></div></>
              ) : (
                <><p className="mt-2 text-sm text-brand-100">Belum ada pengajuan. Pilih kamar pada katalog untuk memulai.</p><button type="button" onClick={() => document.getElementById('katalog')?.scrollIntoView({ behavior: 'smooth' })} className="group mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-bold transition hover:bg-accent-600">Lihat katalog <ArrowRight className="size-4 transition group-hover:translate-x-1" /></button></>
              )}
            </motion.div>
          </div>
        </div></Rise>
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard label="Total reservasi" value={stats.total} icon={ClipboardList} tone="brand" delay={0} />
          <MetricCard label="Sedang diproses" value={stats.processing} icon={Clock} tone="accent" delay={0.08} />
          <MetricCard label="Disetujui" value={stats.approved} icon={CheckCircle2} tone="emerald" delay={0.16} />
        </div>
      </section>

      <section id="reservasi" className="scroll-mt-24 space-y-4">
        <Rise inView><SectionHeader title="Pengajuan & riwayat reservasi" description="Status pengajuan Anda pada periode aktif." /></Rise>
        {reservations.length === 0 ? <Card><EmptyState icon={ClipboardList} title="Belum ada pengajuan reservasi" description="Pilih kamar pada katalog di bawah untuk mulai mengajukan." /></Card> : (
          <div className="grid gap-4 lg:grid-cols-2">
            {reservations.map((item, i) => {
              const resInvoice = invoices.find((inv) => inv.reservation_id === item.id);
              return (
                <Rise key={item.id} inView delay={i * 0.06}><Card as="article" className="h-full p-5 transition hover:-translate-y-0.5 hover:shadow-pop">
                  <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-700"><BedDouble className="size-5" /></span><div><p className="font-bold text-ink">{roomOf(item)}</p><p className="text-xs text-muted">{item.academic_periods?.name}</p></div></div><StatusBadge status={item.status} /></div>
                  <div className="mt-5"><Stepper status={item.status} /></div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-4">
                    <div>
                      {resInvoice ? (
                        <p className="text-xs text-muted">Tagihan: <span className="font-bold text-ink">Rp {Number(resInvoice.amount).toLocaleString('id-ID')}</span> ({resInvoice.status})</p>
                      ) : (
                        <p className="text-xs text-muted">Status: <span className="font-semibold text-ink">{item.status}</span></p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {resInvoice && resInvoice.status === 'ISSUED' && (
                        <Button variant="accent" size="sm" loading={payingInvoiceId === resInvoice.id} onClick={() => void payInvoice(resInvoice)}>
                          Bayar Tagihan
                        </Button>
                      )}
                      {!resInvoice && (item.status === 'ALLOCATED' || item.status === 'PENDING_PAYMENT') && (
                        <Button variant="primary" size="sm" loading={generatingInvoiceFor === item.id} onClick={() => void createInvoice(item.id)}>
                          Terbitkan Tagihan
                        </Button>
                      )}
                      {CANCELLABLE.includes(item.status) && (
                        <Button variant="danger" size="sm" onClick={() => void cancelReservation(item.id)}>
                          Batalkan
                        </Button>
                      )}
                    </div>
                  </div>
                </Card></Rise>
              );
            })}
          </div>
        )}
      </section>

      <section id="dokumen" className="scroll-mt-24 space-y-4">
        <Rise inView><SectionHeader title="Dokumen identitas" description="Unggah KTP dan KTM dalam format JPG, PNG, atau PDF (maks. 5 MB)." /></Rise>
        <div className="grid gap-4 md:grid-cols-2">{(['KTP', 'KTM'] as const).map((kind) => { const latestDoc = documents.find((item) => item.document_type === kind); return <Card key={kind} className="p-5"><div className="flex items-center justify-between gap-3"><div><h3 className="font-bold text-ink">{kind}</h3><p className="mt-1 text-sm text-muted">{latestDoc?.rejection_reason || (latestDoc ? 'Dokumen terakhir Anda.' : 'Belum diunggah.')}</p></div>{latestDoc && <StatusBadge status={latestDoc.status} />}</div><label className="mt-4 inline-flex cursor-pointer items-center rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white"><input className="sr-only" type="file" accept="image/jpeg,image/png,application/pdf" onChange={(event) => void uploadDocument(kind, event.target.files?.[0])} />{latestDoc ? 'Ganti dokumen' : 'Unggah dokumen'}</label></Card>; })}</div>
      </section>

      <section id="pembayaran" className="scroll-mt-24 space-y-4">
        <Rise inView>
          <SectionHeader
            title="Tagihan & Pembayaran Asrama"
            description="Lakukan pembayaran asrama secara aman melalui Midtrans Sandbox (Virtual Account Bank, QRIS, e-Wallet)."
          />
        </Rise>

        {invoices.length === 0 ? (
          <Card className="p-6">
            <EmptyState
              icon={Wallet}
              title="Belum ada tagihan pembayaran"
              description="Tagihan sewa kamar akan otomatis diterbitkan saat pengajuan reservasi Anda telah dialokasikan."
            />
            {reservations.some((r) => r.status === 'ALLOCATED' || r.status === 'PENDING_PAYMENT') && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="accent"
                  onClick={() => {
                    const target = reservations.find((r) => r.status === 'ALLOCATED' || r.status === 'PENDING_PAYMENT');
                    if (target) void createInvoice(target.id);
                  }}
                >
                  Terbitkan Tagihan Sekarang
                </Button>
              </div>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {invoices.map((inv) => {
                const isPaid = inv.status === 'PAID';
                const isPending = inv.status === 'ISSUED';
                return (
                  <Card key={inv.id} className="flex flex-col justify-between p-5">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-xs font-bold text-brand-700">{inv.invoice_number}</p>
                          <h3 className="mt-1 text-base font-bold text-ink">
                            {inv.invoice_items[0]?.description || 'Biaya Sewa Asrama'}
                          </h3>
                          <p className="text-xs text-muted">
                            Jatuh tempo: {new Date(inv.due_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                        <StatusBadge status={inv.status} />
                      </div>

                      <div className="mt-4 rounded-xl bg-canvas p-3.5">
                        <p className="text-xs text-muted">Total Pembayaran</p>
                        <p className="text-2xl font-extrabold text-ink">
                          Rp {Number(inv.amount).toLocaleString('id-ID')}
                        </p>
                      </div>

                      {inv.payments && inv.payments.length > 0 && (
                        <div className="mt-4 border-t border-line/60 pt-3">
                          <p className="text-xs font-semibold text-muted">Riwayat Percobaan Gateway:</p>
                          <ul className="mt-1.5 space-y-1">
                            {inv.payments.slice(0, 3).map((p) => (
                              <li key={p.id} className="flex items-center justify-between text-xs">
                                <span className="font-mono text-muted">{p.id.slice(0, 8)}... ({p.provider_name || 'MIDTRANS'})</span>
                                <span className={p.status === 'SUCCEEDED' ? 'font-bold text-emerald-600' : 'text-muted'}>
                                  {p.status}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-line/60 pt-4">
                      <p className="text-xs text-muted">
                        {isPaid && inv.paid_at
                          ? `Lunas pada ${new Date(inv.paid_at).toLocaleDateString('id-ID')}`
                          : 'Metode: Midtrans Sandbox'}
                      </p>
                      {isPending && (
                        <Button
                          variant="accent"
                          size="sm"
                          loading={payingInvoiceId === inv.id}
                          onClick={() => void payInvoice(inv)}
                        >
                          Bayar via Midtrans
                        </Button>
                      )}
                      {isPaid && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                          <CheckCircle2 className="size-4" /> Pembayaran Selesai
                        </span>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section id="hunian" className="scroll-mt-24 space-y-4">
        <Rise inView><SectionHeader title="Status check-in dan check-out" description="Kamar tetap berstatus terpakai sampai pemeriksaan check-out diselesaikan petugas." /></Rise>
        {assignments.length === 0 ? <Card><EmptyState icon={BedDouble} title="Belum ada alokasi kamar" description="Informasi check-in akan muncul setelah reservasi dialokasikan." /></Card> : <div className="grid gap-4 lg:grid-cols-2">{assignments.map((assignment) => <Card key={assignment.id} className="p-5"><div className="flex justify-between gap-3"><div><h3 className="font-bold text-ink">{assignment.rooms.buildings.name} · Kamar {assignment.rooms.room_number}</h3><p className="mt-1 text-sm text-muted">Check-in: {assignment.check_ins ? 'Sudah dicatat' : 'Menunggu petugas'}</p></div><StatusBadge status={assignment.status} /></div>{assignment.check_out_requests[0] ? <p className="mt-4 text-sm text-muted">Check-out: <b>{assignment.check_out_requests[0].status}</b>{assignment.check_out_requests[0].reason ? ` · ${assignment.check_out_requests[0].reason}` : ''}</p> : assignment.status === 'OCCUPIED' ? <Button className="mt-4" variant="secondary" onClick={() => void requestCheckout(assignment)}>Ajukan check-out</Button> : null}</Card>)}</div>}
      </section>

      <section id="katalog" className="scroll-mt-24 space-y-5">
        <Rise inView><SectionHeader title="Pilih kamar Anda" description="Pilih kamar untuk mengajukan reservasi pada periode pendaftaran aktif." /></Rise>
        <Rise inView><div className="space-y-3">
          <Tabs id="rooms" items={buildingTabs} value={catalogBuilding} onChange={setCatalogBuilding} />
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-60 flex-1 sm:max-w-sm"><Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" /><input aria-label="Cari kamar" value={catalogSearch} onChange={(e) => setCatalogSearch(e.target.value)} placeholder="Cari asrama, kamar, fasilitas" className={cx(fieldClass, 'pl-10')} /></div>
            <select aria-label="Urutkan kamar" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={cx(fieldClass, '!w-auto font-semibold')}><option value="default">Urutan bawaan</option><option value="price-asc">Harga terendah</option><option value="price-desc">Harga tertinggi</option><option value="capacity">Kapasitas terbesar</option></select>
            <button type="button" aria-pressed={onlyFav} onClick={() => setOnlyFav((v) => !v)} className={cx('inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition', onlyFav ? 'border-accent-500 bg-accent-50 text-accent-600' : 'border-line bg-white text-muted hover:text-ink')}><Heart className={cx('size-4', onlyFav && 'fill-current')} />Favorit ({favorites.filter((id) => rooms.some((r) => r.id === id)).length})</button>
          </div>
        </div></Rise>
        {filteredRooms.length === 0 ? <Card><EmptyState icon={BedDouble} title="Tidak ada kamar ditemukan" description="Periode belum dibuka atau tidak ada kamar yang cocok dengan pencarian." /></Card> : (
          <motion.div layout className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filteredRooms.map((room, i) => (
                <motion.div key={room.id} layout initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: Math.min(i, 6) * 0.04, duration: 0.35 }}>
                  <Card as="article" className="group h-full overflow-hidden transition duration-300 hover:-translate-y-1.5 hover:shadow-pop">
                    <div className="relative grid h-40 place-items-center overflow-hidden bg-gradient-to-br from-brand-100 via-brand-50 to-accent-50">
                      <span className="absolute -right-8 -top-8 size-32 rounded-full bg-accent-500/10 transition duration-500 group-hover:scale-150" />
                      <BedDouble className="size-12 text-brand-500/70 transition duration-500 group-hover:-rotate-6 group-hover:scale-125" />
                      <span className="absolute left-4 top-4"><StatusBadge status={room.status} /></span>
                      <button type="button" onClick={() => toggleFavorite(room.id)} aria-pressed={favorites.includes(room.id)} aria-label={favorites.includes(room.id) ? 'Hapus dari favorit' : 'Simpan ke favorit'} className="absolute right-3 top-3 grid size-9 cursor-pointer place-items-center rounded-full bg-white/90 shadow-sm transition hover:scale-110"><Heart className={cx('size-4 transition', favorites.includes(room.id) ? 'fill-accent-500 text-accent-500' : 'text-muted')} /></button>
                      {money(room.room_rates[0]) && <span className="absolute bottom-3 right-4 rounded-full bg-white/95 px-3 py-1 text-sm font-extrabold text-brand-700 shadow-sm">{money(room.room_rates[0])}</span>}
                    </div>
                    <div className="p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-accent-500">{room.buildings.name}</p>
                      <h3 className="mt-1 text-lg font-bold text-ink">Kamar {room.room_number}</h3>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted"><Users className="size-4" />Kapasitas {room.capacity} orang</p>
                      {room.room_facilities.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{room.room_facilities.slice(0, 3).map((f) => <span key={f.facilities.id} className="rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-muted">{f.facilities.name}</span>)}{room.room_facilities.length > 3 && <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">+{room.room_facilities.length - 3}</span>}</div>}
                      <div className="mt-5 grid grid-cols-2 gap-2"><Button variant="secondary" onClick={() => openDetail(room)}>Detail</Button><Button variant="accent" disabled={submittingRoom !== null} loading={submittingRoom === room.id} onClick={() => void reserve(room.id)}>Ajukan</Button></div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      {detail && (
        <Modal title={`${detail.buildings.name} · Kamar ${detail.room_number}`} description={`Kapasitas ${detail.capacity} orang`} onClose={() => setDetail(null)} size="lg" labelledBy="room-detail-title">
          <div className="relative grid h-44 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900"><BedDouble className="size-14 text-white/80" /><span className="absolute -bottom-10 -right-10 size-36 rounded-full bg-accent-500/40" /><span className="absolute left-4 top-4"><StatusBadge status={detail.status} /></span></div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent-100 bg-accent-50 p-4">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-accent-600">Biaya</p><p className="text-2xl font-extrabold text-ink">{money(detail.room_rates[0]) ?? 'Belum ditetapkan'}</p></div>
            <Button variant="accent" disabled={submittingRoom !== null} loading={submittingRoom === detail.id} onClick={() => void reserve(detail.id)}>Ajukan reservasi</Button>
          </div>
          <Tabs id="detail" className="mt-5" items={[{ id: 'ringkasan', label: 'Ringkasan' }, { id: 'fasilitas', label: 'Fasilitas', count: detail.room_facilities.length }, { id: 'biaya', label: 'Biaya', count: detail.room_rates.length }]} value={detailTab} onChange={setDetailTab} />
          <motion.div key={detailTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 min-h-24">
            {detailTab === 'ringkasan' && <div className="space-y-3 text-sm"><p className="leading-6 text-muted">{detail.description || 'Belum ada deskripsi untuk kamar ini.'}</p><p className="flex items-center gap-2 font-semibold text-ink"><ShieldCheck className="size-4 text-brand-700" />Gedung {detail.buildings.name}</p><p className="flex items-center gap-2 font-semibold text-ink"><Users className="size-4 text-brand-700" />Kapasitas {detail.capacity} orang</p></div>}
            {detailTab === 'fasilitas' && (detail.room_facilities.length ? <ul className="grid gap-2 sm:grid-cols-2">{detail.room_facilities.map((f) => <li key={f.facilities.id} className="flex items-center justify-between rounded-xl bg-canvas px-3.5 py-2.5 text-sm"><span className="font-medium text-ink">{f.facilities.name}</span><span className="text-muted">×{f.quantity}</span></li>)}</ul> : <p className="text-sm text-muted">Belum ada data fasilitas.</p>)}
            {detailTab === 'biaya' && (detail.room_rates.length ? <ul className="space-y-2">{detail.room_rates.map((r, i) => <li key={i} className="flex items-center gap-3 rounded-xl bg-canvas px-4 py-3 text-sm"><Wallet className="size-4 text-brand-700" /><span className="font-bold text-ink">{money(r)}</span></li>)}</ul> : <p className="text-sm text-muted">Biaya belum ditetapkan.</p>)}
          </motion.div>
          <div className="mt-6 flex justify-end"><Button variant="secondary" onClick={() => setDetail(null)}>Tutup</Button></div>
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
