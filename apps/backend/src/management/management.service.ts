import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, room_status, user_role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AcademicPeriodDto, BuildingDto, FacilityDto, RoomDto, RoomFacilityDto, RoomRateDto, StaffUpdateDto } from './dto.js';

@Injectable()
export class ManagementService {
  constructor(private readonly prisma: PrismaService) {}
  private readonly roomInclude = { buildings: true, room_facilities: { include: { facilities: true } }, room_rates: { orderBy: { effective_from: 'desc' as const }, take: 1 } };

  async buildings() { return this.prisma.buildings.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { rooms: true } } } }); }
  async rooms(availableOnly = false) { return this.prisma.rooms.findMany({ where: availableOnly ? { status: room_status.AVAILABLE, buildings: { is_active: true } } : undefined, orderBy: [{ buildings: { name: 'asc' } }, { room_number: 'asc' }], include: this.roomInclude }); }
  async createBuilding(dto: BuildingDto) { return this.prisma.buildings.create({ data: { name: dto.name.trim(), gender_policy: dto.genderPolicy, description: dto.description?.trim(), is_active: dto.isActive ?? true } }); }
  async updateBuilding(id: string, dto: BuildingDto) { await this.requireBuilding(id); return this.prisma.buildings.update({ where: { id }, data: { ...(dto.name !== undefined && { name: dto.name.trim() }), ...(dto.genderPolicy !== undefined && { gender_policy: dto.genderPolicy }), ...(dto.description !== undefined && { description: dto.description.trim() }), ...(dto.isActive !== undefined && { is_active: dto.isActive }) } }); }
  async deleteBuilding(id: string) { const building = await this.prisma.buildings.findUnique({ where: { id }, include: { _count: { select: { rooms: true } } } }); if (!building) throw new NotFoundException('Gedung tidak ditemukan.'); if (building._count.rooms) throw new ConflictException('Gedung yang masih memiliki kamar tidak dapat dihapus.'); await this.prisma.buildings.delete({ where: { id } }); return { success: true }; }
  async createRoom(dto: RoomDto) { await this.requireBuilding(dto.buildingId); return this.prisma.rooms.create({ data: { building_id: dto.buildingId, room_number: dto.roomNumber.trim(), capacity: dto.capacity, status: dto.status ?? room_status.AVAILABLE, description: dto.description?.trim() }, include: this.roomInclude }); }
  async updateRoom(id: string, dto: RoomDto) { await this.requireRoom(id); await this.requireBuilding(dto.buildingId); return this.prisma.rooms.update({ where: { id }, data: { building_id: dto.buildingId, room_number: dto.roomNumber.trim(), capacity: dto.capacity, ...(dto.status !== undefined && { status: dto.status }), ...(dto.description !== undefined && { description: dto.description.trim() }) }, include: this.roomInclude }); }
  async deleteRoom(id: string) { const room = await this.prisma.rooms.findUnique({ where: { id }, include: { _count: { select: { room_assignments: true } } } }); if (!room) throw new NotFoundException('Kamar tidak ditemukan.'); if (room._count.room_assignments) throw new ConflictException('Kamar yang memiliki riwayat reservasi tidak dapat dihapus.'); await this.prisma.rooms.delete({ where: { id } }); return { success: true }; }
  async facilities() { return this.prisma.facilities.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { room_facilities: true } } } }); }
  async createFacility(dto: FacilityDto) { return this.prisma.facilities.create({ data: { name: dto.name.trim(), description: dto.description?.trim() } }); }
  async updateFacility(id: string, dto: FacilityDto) { await this.requireFacility(id); return this.prisma.facilities.update({ where: { id }, data: { name: dto.name.trim(), ...(dto.description !== undefined && { description: dto.description.trim() }) } }); }
  async deleteFacility(id: string) { await this.requireFacility(id); await this.prisma.facilities.delete({ where: { id } }); return { success: true }; }
  async addRoomFacility(roomId: string, dto: RoomFacilityDto) { await this.requireRoom(roomId); await this.requireFacility(dto.facilityId); return this.prisma.room_facilities.upsert({ where: { room_id_facility_id: { room_id: roomId, facility_id: dto.facilityId } }, create: { room_id: roomId, facility_id: dto.facilityId, quantity: dto.quantity, notes: dto.notes?.trim() }, update: { quantity: dto.quantity, notes: dto.notes?.trim() } }); }
  async removeRoomFacility(roomId: string, facilityId: string) { await this.prisma.room_facilities.delete({ where: { room_id_facility_id: { room_id: roomId, facility_id: facilityId } } }); return { success: true }; }
  async addRate(roomId: string, dto: RoomRateDto, userId: string) { await this.requireRoom(roomId); return this.prisma.room_rates.create({ data: { room_id: roomId, amount: new Prisma.Decimal(dto.amount), currency: (dto.currency ?? 'IDR').toUpperCase(), effective_from: new Date(dto.effectiveFrom), effective_until: dto.effectiveUntil ? new Date(dto.effectiveUntil) : null, created_by: userId } }); }
  async staffs() { return this.prisma.users.findMany({ where: { role: user_role.STAFF, deleted_at: null }, select: { id: true, email: true, phone_number: true, is_active: true, created_at: true, staff_profiles: { select: { employee_identifier: true } } }, orderBy: { created_at: 'desc' } }); }
  async students() { return this.prisma.student_profiles.findMany({ orderBy: { created_at: 'desc' }, select: { id: true, nim: true, full_name: true, study_program: true, admission_year: true, active_semester: true, academic_status: true, users: { select: { id: true, email: true, is_active: true } }, _count: { select: { reservations: true } } } }); }
  async periods() { return this.prisma.academic_periods.findMany({ orderBy: { start_date: 'desc' } }); }
  async createPeriod(dto: AcademicPeriodDto) { return this.upsertPeriod(null, dto); }
  async updatePeriod(id: string, dto: AcademicPeriodDto) { return this.upsertPeriod(id, dto); }
  async deletePeriod(id: string) { const period = await this.prisma.academic_periods.findUnique({ where: { id }, include: { _count: { select: { reservations: true } } } }); if (!period) throw new NotFoundException('Periode tidak ditemukan.'); if (period._count.reservations) throw new ConflictException('Periode yang sudah memiliki reservasi tidak dapat dihapus.'); await this.prisma.academic_periods.delete({ where: { id } }); return { success: true }; }
  async auditLogs() { return this.prisma.audit_logs.findMany({ take: 100, orderBy: { created_at: 'desc' }, select: { id: true, action: true, entity_type: true, entity_id: true, result: true, created_at: true, users: { select: { email: true } } } }); }
  async updateStaff(id: string, dto: StaffUpdateDto) { const user = await this.prisma.users.findFirst({ where: { id, role: user_role.STAFF, deleted_at: null } }); if (!user) throw new NotFoundException('Akun STAFF tidak ditemukan.'); return this.prisma.$transaction(async tx => { if (dto.phoneNumber !== undefined || dto.isActive !== undefined) await tx.users.update({ where: { id }, data: { ...(dto.phoneNumber !== undefined && { phone_number: dto.phoneNumber.trim() || null }), ...(dto.isActive !== undefined && { is_active: dto.isActive }) } }); if (dto.employeeIdentifier !== undefined) await tx.staff_profiles.update({ where: { user_id: id }, data: { employee_identifier: dto.employeeIdentifier.trim() || null } }); return { success: true }; }); }
  private async requireBuilding(id: string) { const item = await this.prisma.buildings.findUnique({ where: { id } }); if (!item) throw new NotFoundException('Gedung tidak ditemukan.'); return item; }
  private async requireRoom(id: string) { const item = await this.prisma.rooms.findUnique({ where: { id } }); if (!item) throw new NotFoundException('Kamar tidak ditemukan.'); return item; }
  private async requireFacility(id: string) { const item = await this.prisma.facilities.findUnique({ where: { id } }); if (!item) throw new NotFoundException('Fasilitas tidak ditemukan.'); return item; }
  private async upsertPeriod(id: string | null, dto: AcademicPeriodDto) {
    const start = new Date(dto.startDate); const end = new Date(dto.endDate); const open = new Date(dto.registrationOpenAt); const close = new Date(dto.registrationCloseAt);
    if (start >= end) throw new ConflictException('Tanggal akhir periode harus setelah tanggal mulai.');
    if (open >= close) throw new ConflictException('Waktu penutupan pendaftaran harus setelah waktu pembukaan.');
    return this.prisma.$transaction(async tx => {
      if (id) { const current = await tx.academic_periods.findUnique({ where: { id } }); if (!current) throw new NotFoundException('Periode tidak ditemukan.'); }
      if (dto.isActive) await tx.academic_periods.updateMany({ where: id ? { id: { not: id }, is_active: true } : { is_active: true }, data: { is_active: false } });
      const data = { name: dto.name.trim(), start_date: start, end_date: end, registration_open_at: open, registration_close_at: close, ...(dto.isActive !== undefined && { is_active: dto.isActive }) };
      return id ? tx.academic_periods.update({ where: { id }, data }) : tx.academic_periods.create({ data });
    });
  }
}
