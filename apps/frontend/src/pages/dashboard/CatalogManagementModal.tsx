import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Building2,
  CalendarClock,
  DoorOpen,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  managementService,
  type AcademicPeriod,
  type Building,
  type Facility,
  type Room,
} from '../../services/management.service.js';
import {
  Alert,
  Button,
  EmptyState,
  Field,
  Modal,
  StatusBadge,
  cx,
  fieldClass,
  formatDate,
} from '../../components/ui.js';

export type Catalog = {
  buildings: Building[];
  facilities: Facility[];
  rooms: Room[];
  periods: AcademicPeriod[];
};

type CatalogTab = 'buildings' | 'facilities' | 'rooms' | 'periods';
type FormMode = 'idle' | 'create' | 'edit';

interface CatalogManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: Catalog;
  reload: () => Promise<void>;
}

const formatDateForInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const formatDateTimeForInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
};

export const CatalogManagementModal: React.FC<CatalogManagementModalProps> = ({
  isOpen,
  onClose,
  catalog,
  reload,
}) => {
  const { buildings, facilities, rooms, periods } = catalog;
  const [tab, setTab] = useState<CatalogTab>('buildings');
  const [formMode, setFormMode] = useState<FormMode>('idle');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{
    id: string;
    name: string;
    type: CatalogTab;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Dynamic Form states
  const [buildingForm, setBuildingForm] = useState({
    name: '',
    genderPolicy: 'MALE_ONLY',
    description: '',
    isActive: true,
  });

  const [facilityForm, setFacilityForm] = useState({
    name: '',
    description: '',
  });

  const [roomForm, setRoomForm] = useState({
    buildingId: '',
    roomNumber: '',
    capacity: 1,
    status: 'AVAILABLE',
    description: '',
  });

  const [periodForm, setPeriodForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    registrationOpenAt: '',
    registrationCloseAt: '',
    isActive: true,
  });

  // Reset form when tab changes
  useEffect(() => {
    setFormMode('idle');
    setEditingId(null);
    setError('');
    setNotice('');
    setSearch('');
  }, [tab]);

  // Set default building for room form
  useEffect(() => {
    if (!roomForm.buildingId && buildings.length > 0) {
      setRoomForm((r) => ({ ...r, buildingId: buildings[0].id }));
    }
  }, [buildings, roomForm.buildingId]);

  const handleOpenCreate = () => {
    setError('');
    setNotice('');
    setEditingId(null);

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const endStr = new Date(now.getFullYear(), now.getMonth() + 5, now.getDate())
      .toISOString()
      .slice(0, 10);
    const openStr = formatDateTimeForInput(now.toISOString());
    const closeStr = formatDateTimeForInput(
      new Date(now.getTime() + 14 * 86400000).toISOString()
    );

    if (tab === 'buildings') {
      setBuildingForm({ name: '', genderPolicy: 'MALE_ONLY', description: '', isActive: true });
    } else if (tab === 'facilities') {
      setFacilityForm({ name: '', description: '' });
    } else if (tab === 'rooms') {
      setRoomForm({
        buildingId: buildings[0]?.id || '',
        roomNumber: '',
        capacity: 1,
        status: 'AVAILABLE',
        description: '',
      });
    } else if (tab === 'periods') {
      setPeriodForm({
        name: '',
        startDate: dateStr,
        endDate: endStr,
        registrationOpenAt: openStr,
        registrationCloseAt: closeStr,
        isActive: true,
      });
    }
    setFormMode('create');
  };

  const handleOpenEdit = (item: Building | Facility | Room | AcademicPeriod) => {
    setError('');
    setNotice('');
    setEditingId(item.id);

    if (tab === 'buildings') {
      const b = item as Building;
      setBuildingForm({
        name: b.name,
        genderPolicy: b.gender_policy || 'MALE_ONLY',
        description: b.description || '',
        isActive: b.is_active ?? true,
      });
    } else if (tab === 'facilities') {
      const f = item as Facility;
      setFacilityForm({
        name: f.name,
        description: f.description || '',
      });
    } else if (tab === 'rooms') {
      const r = item as Room;
      setRoomForm({
        buildingId: r.buildings?.id || buildings[0]?.id || '',
        roomNumber: r.room_number,
        capacity: r.capacity,
        status: r.status,
        description: r.description || '',
      });
    } else if (tab === 'periods') {
      const p = item as AcademicPeriod;
      setPeriodForm({
        name: p.name,
        startDate: formatDateForInput(p.start_date),
        endDate: formatDateForInput(p.end_date),
        registrationOpenAt: formatDateTimeForInput(p.registration_open_at),
        registrationCloseAt: formatDateTimeForInput(p.registration_close_at),
        isActive: p.is_active ?? true,
      });
    }
    setFormMode('edit');
  };

  const handleCancelForm = () => {
    setFormMode('idle');
    setEditingId(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    try {
      if (tab === 'buildings') {
        if (!buildingForm.name.trim()) throw new Error('Nama gedung wajib diisi.');
        if (formMode === 'create') {
          await managementService.createBuilding({
            name: buildingForm.name.trim(),
            genderPolicy: buildingForm.genderPolicy,
            description: buildingForm.description.trim() || undefined,
            isActive: buildingForm.isActive,
          });
          setNotice(`Gedung "${buildingForm.name}" berhasil ditambahkan.`);
        } else if (editingId) {
          await managementService.updateBuilding(editingId, {
            name: buildingForm.name.trim(),
            genderPolicy: buildingForm.genderPolicy,
            description: buildingForm.description.trim() || undefined,
            isActive: buildingForm.isActive,
          });
          setNotice(`Gedung "${buildingForm.name}" berhasil diperbarui.`);
        }
      } else if (tab === 'facilities') {
        if (!facilityForm.name.trim()) throw new Error('Nama fasilitas wajib diisi.');
        if (formMode === 'create') {
          await managementService.createFacility({
            name: facilityForm.name.trim(),
            description: facilityForm.description.trim() || undefined,
          });
          setNotice(`Fasilitas "${facilityForm.name}" berhasil ditambahkan.`);
        } else if (editingId) {
          await managementService.updateFacility(editingId, {
            name: facilityForm.name.trim(),
            description: facilityForm.description.trim() || undefined,
          });
          setNotice(`Fasilitas "${facilityForm.name}" berhasil diperbarui.`);
        }
      } else if (tab === 'rooms') {
        if (!roomForm.buildingId) throw new Error('Gedung wajib dipilih.');
        if (!roomForm.roomNumber.trim()) throw new Error('Nomor kamar wajib diisi.');
        if (roomForm.capacity < 1) throw new Error('Kapasitas minimal 1 orang.');
        if (formMode === 'create') {
          await managementService.createRoom({
            buildingId: roomForm.buildingId,
            roomNumber: roomForm.roomNumber.trim(),
            capacity: Number(roomForm.capacity),
            status: roomForm.status,
            description: roomForm.description.trim() || undefined,
          });
          setNotice(`Kamar "${roomForm.roomNumber}" berhasil ditambahkan.`);
        } else if (editingId) {
          await managementService.updateRoom(editingId, {
            buildingId: roomForm.buildingId,
            roomNumber: roomForm.roomNumber.trim(),
            capacity: Number(roomForm.capacity),
            status: roomForm.status,
            description: roomForm.description.trim() || undefined,
          });
          setNotice(`Kamar "${roomForm.roomNumber}" berhasil diperbarui.`);
        }
      } else if (tab === 'periods') {
        if (!periodForm.name.trim()) throw new Error('Nama periode wajib diisi.');
        if (!periodForm.startDate || !periodForm.endDate) throw new Error('Rentang tanggal periode wajib diisi.');
        if (!periodForm.registrationOpenAt || !periodForm.registrationCloseAt) throw new Error('Jadwal buka & tutup pendaftaran wajib diisi.');

        const payload = {
          name: periodForm.name.trim(),
          startDate: new Date(periodForm.startDate).toISOString(),
          endDate: new Date(periodForm.endDate).toISOString(),
          registrationOpenAt: new Date(periodForm.registrationOpenAt).toISOString(),
          registrationCloseAt: new Date(periodForm.registrationCloseAt).toISOString(),
          isActive: periodForm.isActive,
        };

        if (formMode === 'create') {
          await managementService.createPeriod(payload);
          setNotice(`Periode "${periodForm.name}" berhasil dibuat.`);
        } else if (editingId) {
          await managementService.updatePeriod(editingId, payload);
          setNotice(`Periode "${periodForm.name}" berhasil diperbarui.`);
        }
      }

      await reload();
      setFormMode('idle');
      setEditingId(null);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Operasi penyimpanan gagal.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setDeleting(true);
    setError('');
    setNotice('');

    try {
      if (deletingItem.type === 'buildings') {
        await managementService.deleteBuilding(deletingItem.id);
        setNotice(`Gedung "${deletingItem.name}" berhasil dihapus.`);
      } else if (deletingItem.type === 'facilities') {
        await managementService.deleteFacility(deletingItem.id);
        setNotice(`Fasilitas "${deletingItem.name}" berhasil dihapus.`);
      } else if (deletingItem.type === 'rooms') {
        await managementService.deleteRoom(deletingItem.id);
        setNotice(`Kamar "${deletingItem.name}" berhasil dihapus.`);
      } else if (deletingItem.type === 'periods') {
        await managementService.deletePeriod(deletingItem.id);
        setNotice(`Periode "${deletingItem.name}" berhasil dihapus.`);
      }

      await reload();
      setDeletingItem(null);
      if (editingId === deletingItem.id) {
        setFormMode('idle');
        setEditingId(null);
      }
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Penghapusan data gagal.');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered lists based on search
  const filteredBuildings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return buildings.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.description && b.description.toLowerCase().includes(q))
    );
  }, [buildings, search]);

  const filteredFacilities = useMemo(() => {
    const q = search.trim().toLowerCase();
    return facilities.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.description && f.description.toLowerCase().includes(q))
    );
  }, [facilities, search]);

  const filteredRooms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rooms.filter(
      (r) =>
        r.room_number.toLowerCase().includes(q) ||
        (r.buildings?.name && r.buildings.name.toLowerCase().includes(q)) ||
        r.status.toLowerCase().includes(q)
    );
  }, [rooms, search]);

  const filteredPeriods = useMemo(() => {
    const q = search.trim().toLowerCase();
    return periods.filter((p) => p.name.toLowerCase().includes(q));
  }, [periods, search]);

  if (!isOpen) return null;

  const tabLabels: Record<CatalogTab, { label: string; count: number; singular: string; icon: React.ElementType }> = {
    buildings: { label: 'Gedung', count: buildings.length, singular: 'Gedung', icon: Building2 },
    facilities: { label: 'Fasilitas', count: facilities.length, singular: 'Fasilitas', icon: Sparkles },
    rooms: { label: 'Kamar', count: rooms.length, singular: 'Kamar', icon: DoorOpen },
    periods: { label: 'Periode', count: periods.length, singular: 'Periode', icon: CalendarClock },
  };

  return (
    <Modal
      title="Kelola Katalog Asrama"
      description="Pusat konfigurasi data gedung, fasilitas, kamar, dan periode pendaftaran asrama."
      onClose={onClose}
      size="2xl"
      labelledBy="catalog-modal-title"
    >
      <div className="space-y-5">
        {/* Alerts Feedback */}
        <AnimatePresence>
          {notice && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Alert tone="success">{notice}</Alert>
            </motion.div>
          )}
          {error && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Alert tone="error">{error}</Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Selection Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
          <div className="flex flex-wrap gap-2">
            {(['buildings', 'facilities', 'rooms', 'periods'] as CatalogTab[]).map((tabKey) => {
              const active = tab === tabKey;
              const { label, count, icon: TabIcon } = tabLabels[tabKey];
              return (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setTab(tabKey)}
                  className={cx(
                    'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer',
                    active
                      ? 'bg-brand-700 text-white shadow-sm ring-2 ring-brand-700/20'
                      : 'border border-line bg-canvas text-muted hover:border-brand-200 hover:bg-slate-100 hover:text-ink'
                  )}
                >
                  <TabIcon className="size-3.5 shrink-0" />
                  <span>{label}</span>
                  <span
                    className={cx(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                      active ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={formMode === 'idle' ? 'primary' : 'secondary'}
              onClick={formMode === 'idle' ? handleOpenCreate : handleCancelForm}
            >
              {formMode === 'idle' ? (
                <>
                  <Plus className="size-4" />
                  Tambah {tabLabels[tab].singular}
                </>
              ) : (
                <>
                  <X className="size-4" />
                  Tutup Form
                </>
              )}
            </Button>
          </div>
        </div>

        {/* SATU AREA FORM DINAMIS (Muncul saat Tambah atau Edit) */}
        <AnimatePresence mode="wait">
          {formMode !== 'idle' && (
            <motion.div
              key={`${tab}-${formMode}-${editingId ?? 'new'}`}
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden rounded-2xl border-2 border-brand-200 bg-brand-50/30 p-5 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between border-b border-brand-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-lg bg-brand-700 text-white">
                    <Sparkles className="size-4" />
                  </span>
                  <div>
                    <h3 className="font-bold text-ink">
                      {formMode === 'create'
                        ? `Tambah Data ${tabLabels[tab].singular}`
                        : `Edit Data ${tabLabels[tab].singular}`}
                    </h3>
                    <p className="text-xs text-muted">
                      {formMode === 'create'
                        ? `Lengkapi formulir di bawah untuk mendaftarkan ${tabLabels[tab].singular.toLowerCase()} baru.`
                        : `Perbarui informasi ${tabLabels[tab].singular.toLowerCase()} yang dipilih.`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="rounded-lg p-1 text-muted hover:bg-white hover:text-ink"
                  aria-label="Batal form"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. Dynamic fields: GEDUNG */}
                {tab === 'buildings' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Field label="Nama Gedung *">
                        <input
                          required
                          value={buildingForm.name}
                          onChange={(e) => setBuildingForm({ ...buildingForm, name: e.target.value })}
                          placeholder="Contoh: Gedung Asrama Mahasiswa Putra A"
                          className={fieldClass}
                        />
                      </Field>
                    </div>
                    <div>
                      <Field label="Kebijakan Gender / Peruntukan">
                        <select
                          value={buildingForm.genderPolicy}
                          onChange={(e) => setBuildingForm({ ...buildingForm, genderPolicy: e.target.value })}
                          className={fieldClass}
                        >
                          <option value="MALE_ONLY">Khusus Mahasiswa Putra (MALE_ONLY)</option>
                          <option value="FEMALE_ONLY">Khusus Mahasiswi Putri (FEMALE_ONLY)</option>
                          <option value="COED">Campuran / Bersama (COED)</option>
                        </select>
                      </Field>
                    </div>
                    <div>
                      <Field label="Status Gedung">
                        <select
                          value={buildingForm.isActive ? 'true' : 'false'}
                          onChange={(e) =>
                            setBuildingForm({ ...buildingForm, isActive: e.target.value === 'true' })
                          }
                          className={fieldClass}
                        >
                          <option value="true">Aktif Beroperasi</option>
                          <option value="false">Nonaktif / Penutupan</option>
                        </select>
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="Deskripsi / Catatan Lokasi (Opsional)">
                        <textarea
                          rows={2}
                          value={buildingForm.description}
                          onChange={(e) =>
                            setBuildingForm({ ...buildingForm, description: e.target.value })
                          }
                          placeholder="Keterangan fasilitas gedung, lantai, akses pintu, dll."
                          className={cx(fieldClass, 'min-h-16 resize-y')}
                        />
                      </Field>
                    </div>
                  </div>
                )}

                {/* 2. Dynamic fields: FASILITAS */}
                {tab === 'facilities' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Field label="Nama Fasilitas *">
                        <input
                          required
                          value={facilityForm.name}
                          onChange={(e) => setFacilityForm({ ...facilityForm, name: e.target.value })}
                          placeholder="Contoh: WiFi Kecepatan Tinggi, AC, Lemari Pakaian, Meja Belajar"
                          className={fieldClass}
                        />
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="Deskripsi / Spesifikasi Fasilitas (Opsional)">
                        <textarea
                          rows={2}
                          value={facilityForm.description}
                          onChange={(e) =>
                            setFacilityForm({ ...facilityForm, description: e.target.value })
                          }
                          placeholder="Rincian kondisi fasilitas atau aturan pemakaian."
                          className={cx(fieldClass, 'min-h-16 resize-y')}
                        />
                      </Field>
                    </div>
                  </div>
                )}

                {/* 3. Dynamic fields: KAMAR */}
                {tab === 'rooms' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Field label="Gedung Asrama *">
                        <select
                          required
                          value={roomForm.buildingId}
                          onChange={(e) => setRoomForm({ ...roomForm, buildingId: e.target.value })}
                          className={fieldClass}
                        >
                          <option value="">-- Pilih Gedung --</option>
                          {buildings.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.gender_policy.replaceAll('_', ' ')})
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <div>
                      <Field label="Nomor Kamar *">
                        <input
                          required
                          value={roomForm.roomNumber}
                          onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
                          placeholder="Contoh: 101, A-203, dsb."
                          className={fieldClass}
                        />
                      </Field>
                    </div>
                    <div>
                      <Field label="Kapasitas Kamar (Orang) *">
                        <input
                          required
                          type="number"
                          min="1"
                          max="10"
                          value={roomForm.capacity}
                          onChange={(e) =>
                            setRoomForm({ ...roomForm, capacity: Math.max(1, parseInt(e.target.value) || 1) })
                          }
                          className={fieldClass}
                        />
                      </Field>
                    </div>
                    <div>
                      <Field label="Status Ketersediaan Kamar">
                        <select
                          value={roomForm.status}
                          onChange={(e) => setRoomForm({ ...roomForm, status: e.target.value })}
                          className={fieldClass}
                        >
                          <option value="AVAILABLE">Tersedia (AVAILABLE)</option>
                          <option value="OCCUPIED">Penuh / Dihuni (OCCUPIED)</option>
                          <option value="MAINTENANCE">Perbaikan (MAINTENANCE)</option>
                          <option value="RESERVED">Dipesan (RESERVED)</option>
                        </select>
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="Deskripsi Kamar (Opsional)">
                        <textarea
                          rows={2}
                          value={roomForm.description}
                          onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
                          placeholder="Catatan posisi kamar, jendela, ventilasi, dsb."
                          className={cx(fieldClass, 'min-h-16 resize-y')}
                        />
                      </Field>
                    </div>
                  </div>
                )}

                {/* 4. Dynamic fields: PERIODE */}
                {tab === 'periods' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Field label="Nama Periode Akademik *">
                        <input
                          required
                          value={periodForm.name}
                          onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
                          placeholder="Contoh: Semester Ganjil 2026/2027"
                          className={fieldClass}
                        />
                      </Field>
                    </div>
                    <div>
                      <Field label="Mulai Masa Hunian *">
                        <input
                          required
                          type="date"
                          value={periodForm.startDate}
                          onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })}
                          className={fieldClass}
                        />
                      </Field>
                    </div>
                    <div>
                      <Field label="Selesai Masa Hunian *">
                        <input
                          required
                          type="date"
                          value={periodForm.endDate}
                          onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })}
                          className={fieldClass}
                        />
                      </Field>
                    </div>
                    <div>
                      <Field label="Jadwal Pendaftaran Dibuka *">
                        <input
                          required
                          type="datetime-local"
                          value={periodForm.registrationOpenAt}
                          onChange={(e) =>
                            setPeriodForm({ ...periodForm, registrationOpenAt: e.target.value })
                          }
                          className={fieldClass}
                        />
                      </Field>
                    </div>
                    <div>
                      <Field label="Jadwal Pendaftaran Ditutup *">
                        <input
                          required
                          type="datetime-local"
                          value={periodForm.registrationCloseAt}
                          onChange={(e) =>
                            setPeriodForm({ ...periodForm, registrationCloseAt: e.target.value })
                          }
                          className={fieldClass}
                        />
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-ink">
                        <input
                          type="checkbox"
                          checked={periodForm.isActive}
                          onChange={(e) =>
                            setPeriodForm({ ...periodForm, isActive: e.target.checked })
                          }
                          className="size-4 rounded text-brand-700 focus:ring-brand-500"
                        />
                        <span>Jadikan sebagai Periode Aktif Pendaftaran</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Form Buttons */}
                <div className="flex justify-end gap-2 border-t border-brand-100 pt-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={saving}
                    onClick={handleCancelForm}
                  >
                    Batal
                  </Button>
                  <Button type="submit" size="sm" loading={saving}>
                    {saving
                      ? 'Menyimpan…'
                      : formMode === 'create'
                      ? `Simpan ${tabLabels[tab].singular}`
                      : `Perbarui ${tabLabels[tab].singular}`}
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search & Counter Toolbar */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-muted">
            Daftar {tabLabels[tab].label} ({tab === 'buildings' ? filteredBuildings.length : tab === 'facilities' ? filteredFacilities.length : tab === 'rooms' ? filteredRooms.length : filteredPeriods.length} data)
          </p>
          <div className="relative min-w-48 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Cari ${tabLabels[tab].label.toLowerCase()}…`}
              className={cx(fieldClass, 'py-1.5 pl-8 text-xs')}
            />
          </div>
        </div>

        {/* ORGANIZED DATA LIST */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-line rounded-2xl border border-line bg-white">
          {/* TAB GEDUNG */}
          {tab === 'buildings' &&
            (filteredBuildings.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="Tidak ada gedung"
                description={
                  search ? 'Tidak ada gedung yang cocok dengan kata kunci.' : 'Belum ada data gedung.'
                }
              />
            ) : (
              filteredBuildings.map((b) => {
                const countRooms = b._count?.rooms ?? rooms.filter((r) => r.buildings?.id === b.id).length;
                return (
                  <div
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-slate-50/60"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                        <Building2 className="size-4" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-ink text-sm">{b.name}</p>
                          <StatusBadge status={b.is_active ? 'Aktif' : 'Nonaktif'} />
                        </div>
                        <p className="mt-0.5 text-xs text-muted">
                          Peruntukan: <span className="font-medium text-ink">{b.gender_policy.replaceAll('_', ' ')}</span> · {countRooms} kamar
                          {b.description ? ` · ${b.description}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenEdit(b)}
                        title="Edit gedung"
                      >
                        <Pencil className="size-3.5" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setDeletingItem({ id: b.id, name: b.name, type: 'buildings' })}
                        title="Hapus gedung"
                      >
                        <Trash2 className="size-3.5" />
                        Hapus
                      </Button>
                    </div>
                  </div>
                );
              })
            ))}

          {/* TAB FASILITAS */}
          {tab === 'facilities' &&
            (filteredFacilities.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="Tidak ada fasilitas"
                description={
                  search
                    ? 'Tidak ada fasilitas yang cocok dengan kata kunci.'
                    : 'Belum ada data fasilitas.'
                }
              />
            ) : (
              filteredFacilities.map((f) => (
                <div
                  key={f.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-slate-50/60"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600">
                      <Sparkles className="size-4" />
                    </span>
                    <div>
                      <p className="font-semibold text-ink text-sm">{f.name}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {f.description || 'Tidak ada deskripsi tambahan.'}
                        {f._count?.room_facilities ? ` · Digunakan di ${f._count.room_facilities} kamar` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleOpenEdit(f)}
                      title="Edit fasilitas"
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setDeletingItem({ id: f.id, name: f.name, type: 'facilities' })}
                      title="Hapus fasilitas"
                    >
                      <Trash2 className="size-3.5" />
                      Hapus
                    </Button>
                  </div>
                </div>
              ))
            ))}

          {/* TAB KAMAR */}
          {tab === 'rooms' &&
            (filteredRooms.length === 0 ? (
              <EmptyState
                icon={DoorOpen}
                title="Tidak ada kamar"
                description={
                  search ? 'Tidak ada kamar yang cocok dengan kata kunci.' : 'Belum ada data kamar.'
                }
              />
            ) : (
              filteredRooms.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-slate-50/60"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                      <DoorOpen className="size-4" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-ink text-sm">Kamar {r.room_number}</p>
                        <StatusBadge status={r.status} />
                      </div>
                      <p className="mt-0.5 text-xs text-muted">
                        Gedung: <span className="font-medium text-ink">{r.buildings?.name ?? '—'}</span> · Kapasitas: {r.capacity} orang
                        {r.description ? ` · ${r.description}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleOpenEdit(r)}
                      title="Edit kamar"
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() =>
                        setDeletingItem({
                          id: r.id,
                          name: `Kamar ${r.room_number} (${r.buildings?.name ?? ''})`,
                          type: 'rooms',
                        })
                      }
                      title="Hapus kamar"
                    >
                      <Trash2 className="size-3.5" />
                      Hapus
                    </Button>
                  </div>
                </div>
              ))
            ))}

          {/* TAB PERIODE */}
          {tab === 'periods' &&
            (filteredPeriods.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="Tidak ada periode"
                description={
                  search ? 'Tidak ada periode yang cocok dengan kata kunci.' : 'Belum ada periode pendaftaran.'
                }
              />
            ) : (
              filteredPeriods.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-slate-50/60"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                      <CalendarClock className="size-4" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-ink text-sm">{p.name}</p>
                        {p.is_active && <StatusBadge status="Aktif" />}
                      </div>
                      <p className="mt-0.5 text-xs text-muted">
                        Masa Hunian: {formatDate(p.start_date)} s/d {formatDate(p.end_date)}
                      </p>
                      <p className="text-[11px] text-muted">
                        Pendaftaran: {formatDate(p.registration_open_at)} — {formatDate(p.registration_close_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleOpenEdit(p)}
                      title="Edit periode"
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setDeletingItem({ id: p.id, name: p.name, type: 'periods' })}
                      title="Hapus periode"
                    >
                      <Trash2 className="size-3.5" />
                      Hapus
                    </Button>
                  </div>
                </div>
              ))
            ))}
        </div>

        {/* Modal Konfirmasi Hapus Data */}
        {deletingItem && (
          <div className="rounded-xl border border-red-200 bg-red-50/70 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-600" />
              <div className="flex-1">
                <h4 className="text-sm font-bold text-red-900">
                  Konfirmasi Penghapusan {tabLabels[deletingItem.type].singular}
                </h4>
                <p className="mt-1 text-xs text-red-700">
                  Apakah Anda yakin ingin menghapus <strong>"{deletingItem.name}"</strong>? Tindakan ini tidak dapat dibatalkan dan dapat mempengaruhi reservasi yang berkaitan.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={deleting}
                    onClick={() => setDeletingItem(null)}
                  >
                    Batal
                  </Button>
                  <Button
                    size="sm"
                    loading={deleting}
                    className="!bg-red-600 hover:!bg-red-700 text-white"
                    onClick={handleConfirmDelete}
                  >
                    {deleting ? 'Menghapus…' : 'Ya, Hapus Data'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
