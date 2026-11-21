import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { assignment_status, reservation_status, room_status, user_role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateReservationDto, UpdateReservationStatusDto } from './dto.js';

const terminal = new Set<reservation_status>([reservation_status.CANCELLED, reservation_status.EXPIRED, reservation_status.COMPLETED]);
const transitions: Partial<Record<reservation_status, reservation_status[]>> = {
  [reservation_status.SUBMITTED]: [reservation_status.PENDING_ACADEMIC_VERIFICATION, reservation_status.PENDING_DOCUMENTS, reservation_status.ALLOCATED, reservation_status.CANCELLED],
  [reservation_status.PENDING_ACADEMIC_VERIFICATION]: [reservation_status.PENDING_DOCUMENTS, reservation_status.ALLOCATED, reservation_status.CANCELLED],
  [reservation_status.PENDING_DOCUMENTS]: [reservation_status.PENDING_PAYMENT, reservation_status.ALLOCATED, reservation_status.CANCELLED],
  [reservation_status.PENDING_PAYMENT]: [reservation_status.ALLOCATED, reservation_status.CONFIRMED, reservation_status.CANCELLED],
  [reservation_status.ALLOCATED]: [reservation_status.CONFIRMED, reservation_status.CANCELLED],
  [reservation_status.CONFIRMED]: [reservation_status.COMPLETED, reservation_status.CANCELLED],
};
@Injectable()
export class ReservationsService {
 constructor(private readonly prisma: PrismaService) {}
  private readonly include = {
    student_profiles: { select: { full_name: true, nim: true, user_id: true } },
    academic_periods: { select: { name: true, start_date: true, end_date: true } },
    room_assignments: { include: { rooms: { include: { buildings: true } } } },
    reservation_status_histories: { orderBy: { created_at: 'asc' as const }, include: { users: { select: { role: true } } } },
    invoices: { include: { invoice_items: true, payments: { orderBy: { created_at: 'desc' as const } } } },
  };
 async mine(userId: string) { const profile = await this.profile(userId); return this.prisma.reservations.findMany({ where: { student_id: profile.id }, orderBy: { created_at: 'desc' }, include: this.include }); }
 async list() { return this.prisma.reservations.findMany({ orderBy: { created_at: 'desc' }, include: this.include }); }
 async one(id: string, userId: string, role: string) { const reservation = await this.prisma.reservations.findUnique({ where: { id }, include: this.include }); if (!reservation) throw new NotFoundException('Reservasi tidak ditemukan.'); if (role === user_role.USER && reservation.student_profiles.user_id !== userId) throw new ForbiddenException('Anda tidak dapat melihat reservasi ini.'); return reservation; }
 async create(userId: string, dto: CreateReservationDto) {
   const now = new Date(); const profile = await this.profile(userId);
   const period = await this.prisma.academic_periods.findFirst({ where: { is_active: true, registration_open_at: { lte: now }, registration_close_at: { gte: now } } });
   if (!period) throw new BadRequestException('Tidak ada periode pendaftaran aktif saat ini.');
   return this.prisma.$transaction(async tx => {
     const duplicate = await tx.reservations.findFirst({ where: { student_id: profile.id, academic_period_id: period.id, status: { notIn: [reservation_status.CANCELLED, reservation_status.EXPIRED, reservation_status.COMPLETED] } } });
     if (duplicate) throw new ConflictException('Anda sudah memiliki pengajuan aktif pada periode ini.');
     const room = await tx.rooms.findUnique({ where: { id: dto.roomId } });
     if (!room || room.status !== room_status.AVAILABLE) throw new BadRequestException('Kamar tidak tersedia untuk dipesan.');
     const assignments = await tx.room_assignments.count({ where: { room_id: room.id, status: { in: [assignment_status.RESERVED, assignment_status.OCCUPIED] }, start_date: { lt: period.end_date }, end_date: { gt: period.start_date } } });
     if (assignments >= room.capacity) throw new ConflictException('Kapasitas kamar telah penuh.');
     const reservation = await tx.reservations.create({ data: { student_id: profile.id, academic_period_id: period.id, status: reservation_status.SUBMITTED, submitted_at: now }, include: this.include });
     await tx.room_assignments.create({ data: { reservation_id: reservation.id, room_id: room.id, start_date: period.start_date, end_date: period.end_date, status: assignment_status.RESERVED } });
     await tx.reservation_status_histories.create({ data: { reservation_id: reservation.id, new_status: reservation_status.SUBMITTED, changed_by: userId, reason: 'Pengajuan dibuat oleh mahasiswa.' } });
     await tx.audit_logs.create({ data: { user_id: userId, action: 'CREATE', entity_type: 'reservation', entity_id: reservation.id, new_values: { status: reservation_status.SUBMITTED, roomId: room.id }, result: 'SUCCESS' } });
     return this.oneFromTx(tx, reservation.id);
   });
 }
 async changeStatus(id: string, userId: string, dto: UpdateReservationStatusDto) {
   return this.prisma.$transaction(async tx => {
     const reservation = await tx.reservations.findUnique({ where: { id }, include: { room_assignments: true } });
     if (!reservation) throw new NotFoundException('Reservasi tidak ditemukan.');
     if (!(transitions[reservation.status] ?? []).includes(dto.status)) throw new BadRequestException(`Perubahan dari ${reservation.status} ke ${dto.status} tidak diizinkan.`);
     if (dto.status === reservation_status.CANCELLED && !dto.reason?.trim()) throw new BadRequestException('Alasan penolakan atau pembatalan wajib diisi.');
     await tx.reservations.update({ where: { id }, data: { status: dto.status, ...(dto.status === reservation_status.CANCELLED && { cancelled_at: new Date(), cancellation_reason: dto.reason?.trim() ?? null }) } });
     if (dto.status === reservation_status.CANCELLED) await tx.room_assignments.updateMany({ where: { reservation_id: id, status: assignment_status.RESERVED }, data: { status: assignment_status.CANCELLED } });
     await tx.reservation_status_histories.create({ data: { reservation_id: id, old_status: reservation.status, new_status: dto.status, changed_by: userId, reason: dto.reason?.trim() } });
     await tx.audit_logs.create({ data: { user_id: userId, action: 'UPDATE_STATUS', entity_type: 'reservation', entity_id: id, old_values: { status: reservation.status }, new_values: { status: dto.status, reason: dto.reason?.trim() }, result: 'SUCCESS' } });
     return this.oneFromTx(tx, id);
   });
 }
 async cancelMine(id: string, userId: string, reason?: string) { const item = await this.one(id, userId, user_role.USER); if (terminal.has(item.status)) throw new BadRequestException('Reservasi ini tidak dapat dibatalkan.'); return this.changeStatus(id, userId, { status: reservation_status.CANCELLED, reason }); }
 private async profile(userId: string) { const profile = await this.prisma.student_profiles.findUnique({ where: { user_id: userId } }); if (!profile) throw new ForbiddenException('Profil mahasiswa tidak ditemukan.'); return profile; }
 private oneFromTx(tx: any, id: string) { return tx.reservations.findUnique({ where: { id }, include: this.include }); }
}
