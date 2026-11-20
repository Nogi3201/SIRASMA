import { Injectable } from '@nestjs/common';
import { reservation_status, user_role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async adminSummary() {
    const [students, staff, buildings, rooms, reservations, recentReservations, byStatus] = await Promise.all([
      this.prisma.users.count({ where: { role: user_role.USER, deleted_at: null } }),
      this.prisma.users.count({ where: { role: user_role.STAFF, deleted_at: null } }),
      this.prisma.buildings.count(),
      this.prisma.rooms.count(),
      this.prisma.reservations.count(),
      this.prisma.reservations.findMany({
        take: 8,
        orderBy: { created_at: 'desc' },
        include: { student_profiles: { select: { full_name: true, nim: true } }, academic_periods: { select: { name: true } }, room_assignments: { include: { rooms: { include: { buildings: true } } } } },
      }),
      this.prisma.reservations.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    return {
      totals: { students, staff, buildings, rooms, reservations },
      statusSummary: byStatus.map((item) => ({ status: item.status, count: item._count._all })),
      recentReservations: recentReservations.map((item) => ({
        id: item.id, status: item.status, createdAt: item.created_at, submittedAt: item.submitted_at,
        student: { name: item.student_profiles.full_name, nim: item.student_profiles.nim },
        academicPeriod: item.academic_periods.name,
        room: item.room_assignments[0] ? { number: item.room_assignments[0].rooms.room_number, building: item.room_assignments[0].rooms.buildings.name } : null,
      })),
    };
  }

  async staffSummary() {
    const pendingStatuses: reservation_status[] = [reservation_status.SUBMITTED, reservation_status.PENDING_ACADEMIC_VERIFICATION, reservation_status.PENDING_DOCUMENTS];
    const [pending, recent, rooms] = await Promise.all([
      this.prisma.reservations.count({ where: { status: { in: pendingStatuses } } }),
      this.prisma.reservations.findMany({ take: 8, orderBy: { created_at: 'desc' }, include: { student_profiles: { select: { full_name: true, nim: true } }, academic_periods: { select: { name: true } } } }),
      this.prisma.rooms.count({ where: { status: 'AVAILABLE' } }),
    ]);
    return { pendingReservations: pending, availableRooms: rooms, recentReservations: recent.map((item) => ({ id: item.id, status: item.status, createdAt: item.created_at, student: { name: item.student_profiles.full_name, nim: item.student_profiles.nim }, academicPeriod: item.academic_periods.name })) };
  }

  async studentSummary(userId: string) {
    const profile = await this.prisma.student_profiles.findUnique({ where: { user_id: userId }, select: { id: true, full_name: true, nim: true } });
    if (!profile) return { profile: null, activeReservation: null, history: [] };
    const reservations = await this.prisma.reservations.findMany({ where: { student_id: profile.id }, orderBy: { created_at: 'desc' }, include: { academic_periods: { select: { name: true } }, room_assignments: { include: { rooms: { include: { buildings: true } } } } } });
    const terminalStatuses = new Set<reservation_status>([reservation_status.CANCELLED, reservation_status.EXPIRED, reservation_status.COMPLETED]);
    return { profile: { name: profile.full_name, nim: profile.nim }, activeReservation: reservations.find((item) => !terminalStatuses.has(item.status)) ?? null, history: reservations };
  }
}
