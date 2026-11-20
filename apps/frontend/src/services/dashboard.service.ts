import { apiClient } from './api.js';

export type ReservationPreview = { id: string; status: string; createdAt: string; submittedAt?: string | null; student: { name: string; nim: string }; academicPeriod: string; room: { number: string; building: string } | null };
export type AdminDashboardData = { totals: { students: number; staff: number; buildings: number; rooms: number; reservations: number }; statusSummary: { status: string; count: number }[]; recentReservations: ReservationPreview[] };
export const dashboardService = {
  admin: () => apiClient<{ success: boolean; data: AdminDashboardData }>('/dashboard/admin'),
  staff: () => apiClient<{ success: boolean; data: { pendingReservations: number; availableRooms: number; recentReservations: ReservationPreview[] } }>('/dashboard/staff'),
  student: () => apiClient<{ success: boolean; data: unknown }>('/dashboard/student'),
};
