import { apiClient } from './api.js';
export type Reservation = { id: string; status: string; created_at: string; submitted_at?: string | null; student_profiles?: { full_name: string; nim: string }; academic_periods?: { name: string }; room_assignments?: { rooms: { room_number: string; buildings: { name: string } } }[]; reservation_status_histories?: { new_status: string; reason?: string | null; created_at: string }[] };
export const reservationsService = {
  mine: () => apiClient<Reservation[]>('/reservations/mine'),
  all: () => apiClient<Reservation[]>('/reservations'),
  create: (roomId: string) => apiClient<Reservation>('/reservations', { method: 'POST', body: JSON.stringify({ roomId }) }),
  cancel: (id: string, reason?: string) => apiClient<Reservation>(`/reservations/${id}/cancel`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  changeStatus: (id: string, status: string, reason?: string) => apiClient<Reservation>(`/reservations/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, reason }) }),
};
