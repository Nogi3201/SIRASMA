import { PrismaClient, academic_status, assignment_status, reservation_status, room_status, user_role, verification_status } from '@prisma/client';
import argon2 from 'argon2';

const databaseUrl = process.env.DATABASE_URL;
const password = process.env.DEMO_USER_PASSWORD;
if (process.env.NODE_ENV !== 'development') {
  throw new Error('Seed DEMO hanya boleh dijalankan saat NODE_ENV=development.');
}
if (!databaseUrl) throw new Error('DATABASE_URL wajib tersedia.');
if (/(^|[._-])(prod|production)([._-]|$)|rds\.amazonaws\.com/i.test(databaseUrl)) {
  throw new Error('Seed DEMO ditolak: DATABASE_URL terindikasi mengarah ke production.');
}
if (!password || password.length < 8) {
  throw new Error('DEMO_USER_PASSWORD wajib diisi dan minimal 8 karakter.');
}

const prisma = new PrismaClient();
const summary = { buildings: { created: 0, skipped: 0 }, rooms: { created: 0, skipped: 0 }, facilities: { created: 0, skipped: 0 }, period: { created: 0, skipped: 0, active: false }, students: { created: 0, skipped: 0 }, reservations: { created: 0, skipped: 0 } };
const now = new Date();
const dateOnly = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
const periodStart = dateOnly(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
const periodEnd = dateOnly(new Date(now.getFullYear(), now.getMonth() + 5, now.getDate()));

async function upsertBuilding(data) {
  const existing = await prisma.buildings.findUnique({ where: { name: data.name } });
  if (existing) { summary.buildings.skipped++; return existing; }
  summary.buildings.created++;
  return prisma.buildings.create({ data });
}
async function upsertFacility(data) {
  const existing = await prisma.facilities.findUnique({ where: { name: data.name } });
  if (existing) { summary.facilities.skipped++; return existing; }
  summary.facilities.created++;
  return prisma.facilities.create({ data });
}
async function upsertRoom(buildingId, roomNumber, capacity, description) {
  const existing = await prisma.rooms.findUnique({ where: { building_id_room_number: { building_id: buildingId, room_number: roomNumber } } });
  if (existing) { summary.rooms.skipped++; return existing; }
  summary.rooms.created++;
  return prisma.rooms.create({ data: { building_id: buildingId, room_number: roomNumber, capacity, status: room_status.AVAILABLE, description } });
}

try {
  const staffMember = await prisma.users.findFirst({ where: { role: user_role.STAFF, deleted_at: null, is_active: true }, select: { id: true } });
  if (!staffMember) {
    throw new Error('Seed DEMO memerlukan minimal satu akun STAFF aktif agar simulasi penolakan memiliki pelaku STAFF yang sah. Buat akun STAFF terlebih dahulu melalui ADMIN.');
  }

  const [putri, putra] = await Promise.all([
    upsertBuilding({ name: 'DEMO Asrama Cendekia A', gender_policy: 'FEMALE_ONLY', description: 'Data simulasi untuk pengujian aplikasi.' }),
    upsertBuilding({ name: 'DEMO Asrama Cendekia B', gender_policy: 'MALE_ONLY', description: 'Data simulasi untuk pengujian aplikasi.' }),
  ]);
  const facilities = await Promise.all([
    upsertFacility({ name: 'DEMO Wi-Fi', description: 'Akses internet simulasi.' }),
    upsertFacility({ name: 'DEMO Meja Belajar', description: 'Meja belajar simulasi.' }),
    upsertFacility({ name: 'DEMO Lemari', description: 'Lemari penyimpanan simulasi.' }),
    upsertFacility({ name: 'DEMO Kamar Mandi Dalam', description: 'Fasilitas kamar mandi simulasi.' }),
  ]);
  const rooms = await Promise.all([
    upsertRoom(putri.id, 'DEMO-A101', 2, 'Kamar demo dua penghuni.'),
    upsertRoom(putri.id, 'DEMO-A102', 3, 'Kamar demo tiga penghuni.'),
    upsertRoom(putra.id, 'DEMO-B101', 2, 'Kamar demo dua penghuni.'),
    upsertRoom(putra.id, 'DEMO-B102', 4, 'Kamar demo empat penghuni.'),
  ]);
  for (const room of rooms) {
    for (const facility of facilities.slice(0, room.room_number.endsWith('101') ? 4 : 3)) {
      await prisma.room_facilities.upsert({ where: { room_id_facility_id: { room_id: room.id, facility_id: facility.id } }, create: { room_id: room.id, facility_id: facility.id, quantity: 1 }, update: {} });
    }
    const existingRate = await prisma.room_rates.findFirst({ where: { room_id: room.id, effective_from: periodStart } });
    if (!existingRate) await prisma.room_rates.create({ data: { room_id: room.id, amount: room.capacity === 2 ? 850000 : room.capacity === 3 ? 700000 : 600000, currency: 'IDR', effective_from: periodStart } });
  }

  const otherActive = await prisma.academic_periods.findFirst({ where: { is_active: true, name: { not: 'DEMO Periode Akademik 2026/2027' } } });
  let period = await prisma.academic_periods.findUnique({ where: { name: 'DEMO Periode Akademik 2026/2027' } });
  if (!period) {
    period = await prisma.academic_periods.create({ data: { name: 'DEMO Periode Akademik 2026/2027', start_date: periodStart, end_date: periodEnd, registration_open_at: new Date(now.getTime() - 24 * 60 * 60 * 1000), registration_close_at: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000), is_active: !otherActive } });
    summary.period.created++; summary.period.active = !otherActive;
  } else {
    // Only change the DEMO period itself. Existing non-DEMO periods remain untouched.
    if (!period.is_active && !otherActive) period = await prisma.academic_periods.update({ where: { id: period.id }, data: { is_active: true } });
    summary.period.skipped++; summary.period.active = period.is_active;
  }

  const demos = [
    { email: 'demo.student1@example.com', nim: 'DEMO26001', fullName: 'Mahasiswa Demo Satu', program: 'Manajemen Logistik', semester: 3, room: rooms[0], target: reservation_status.SUBMITTED },
    { email: 'demo.student2@example.com', nim: 'DEMO26002', fullName: 'Mahasiswa Demo Dua', program: 'Bisnis Digital', semester: 5, room: rooms[1], target: reservation_status.ALLOCATED },
    { email: 'demo.student3@example.com', nim: 'DEMO26003', fullName: 'Mahasiswa Demo Tiga', program: 'Akuntansi', semester: 1, room: rooms[2], target: reservation_status.CANCELLED },
  ];
  for (const demo of demos) {
    let user = await prisma.users.findUnique({ where: { email: demo.email } });
    if (!user) {
      const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
      user = await prisma.users.create({ data: { email: demo.email, password_hash: passwordHash, role: user_role.USER, is_active: true } });
      summary.students.created++;
    } else { summary.students.skipped++; }
    if (user.role !== user_role.USER) throw new Error(`Email demo ${demo.email} sudah digunakan oleh role non-USER.`);
    const profile = await prisma.student_profiles.upsert({ where: { user_id: user.id }, create: { user_id: user.id, nim: demo.nim, full_name: demo.fullName, study_program: demo.program, admission_year: 2026, active_semester: demo.semester, academic_status: academic_status.ACTIVE }, update: {} });
    const verification = await prisma.academic_verifications.findFirst({ where: { student_id: profile.id } });
    if (!verification) await prisma.academic_verifications.create({ data: { student_id: profile.id, status: verification_status.APPROVED, notes: 'Profil DEMO untuk pengujian.' } });
    const existingReservation = await prisma.reservations.findFirst({ where: { student_id: profile.id, academic_period_id: period.id } });
    if (existingReservation) { summary.reservations.skipped++; continue; }
    await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservations.create({ data: { student_id: profile.id, academic_period_id: period.id, status: demo.target, submitted_at: now, ...(demo.target === reservation_status.CANCELLED && { cancelled_at: now, cancellation_reason: 'DEMO: pengajuan ditolak oleh STAFF karena data pengajuan belum memenuhi ketentuan.' }) } });
      await tx.room_assignments.create({ data: { reservation_id: reservation.id, room_id: demo.room.id, start_date: periodStart, end_date: periodEnd, status: demo.target === reservation_status.CANCELLED ? assignment_status.CANCELLED : assignment_status.RESERVED, assigned_by: demo.target === reservation_status.SUBMITTED ? null : staffMember.id } });
      await tx.reservation_status_histories.create({ data: { reservation_id: reservation.id, new_status: reservation_status.SUBMITTED, changed_by: user.id, reason: 'DEMO: pengajuan dibuat.' } });
      if (demo.target !== reservation_status.SUBMITTED) await tx.reservation_status_histories.create({ data: { reservation_id: reservation.id, old_status: reservation_status.SUBMITTED, new_status: demo.target, changed_by: staffMember.id, reason: demo.target === reservation_status.ALLOCATED ? 'DEMO: pengajuan disetujui oleh STAFF.' : 'DEMO: pengajuan ditolak oleh STAFF karena data pengajuan belum memenuhi ketentuan.' } });
      await tx.audit_logs.create({ data: { user_id: user.id, action: 'SEED_DEMO', entity_type: 'reservation', entity_id: reservation.id, new_values: { status: demo.target, demo: true }, result: 'SUCCESS' } });
    });
    summary.reservations.created++;
  }
  console.log('\nSIRASMA demo seed selesai.');
  console.table(summary);
  console.log('Akun DEMO: demo.student1@example.com, demo.student2@example.com, demo.student3@example.com');
  if (!summary.period.active) console.log('Catatan: periode DEMO tidak diaktifkan karena sudah ada periode aktif non-DEMO. Periode tersebut tidak diubah; pengujian pengajuan memakai periode aktif yang sudah ada.');
} finally {
  await prisma.$disconnect();
}
