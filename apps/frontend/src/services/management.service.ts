import { apiClient } from './api.js';
export type Building = { id: string; name: string; gender_policy: string; description?: string | null; is_active: boolean; _count?: { rooms: number } };
export type Facility = { id: string; name: string; description?: string | null; _count?: { room_facilities: number } };
export type Room = { id: string; room_number: string; capacity: number; status: string; description?: string | null; buildings: { id: string; name: string }; room_facilities: { quantity: number; facilities: Facility }[]; room_rates: { amount: string; currency: string }[] };
export type Staff = { id: string; email: string; phone_number?: string | null; is_active: boolean; created_at: string; staff_profiles?: { employee_identifier?: string | null } | null };
export type AcademicPeriod = { id: string; name: string; start_date: string; end_date: string; registration_open_at: string; registration_close_at: string; is_active: boolean };
export const managementService = {
  rooms: (available = false) => apiClient<Room[]>(`/management/rooms${available ? '?available=true' : ''}`),
  buildings: () => apiClient<Building[]>('/management/buildings'),
  facilities: () => apiClient<Facility[]>('/management/facilities'),
  staffs: () => apiClient<Staff[]>('/management/staff'),
  createBuilding: (body: unknown) => apiClient<Building>('/management/buildings', { method: 'POST', body: JSON.stringify(body) }),
  updateBuilding: (id: string, body: unknown) => apiClient<Building>(`/management/buildings/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteBuilding: (id: string) => apiClient(`/management/buildings/${id}`, { method: 'DELETE' }),
  createRoom: (body: unknown) => apiClient<Room>('/management/rooms', { method: 'POST', body: JSON.stringify(body) }),
  updateRoom: (id: string, body: unknown) => apiClient<Room>(`/management/rooms/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteRoom: (id: string) => apiClient(`/management/rooms/${id}`, { method: 'DELETE' }),
  createFacility: (body: unknown) => apiClient<Facility>('/management/facilities', { method: 'POST', body: JSON.stringify(body) }),
  updateFacility: (id: string, body: unknown) => apiClient<Facility>(`/management/facilities/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteFacility: (id: string) => apiClient(`/management/facilities/${id}`, { method: 'DELETE' }),
  periods: () => apiClient<AcademicPeriod[]>('/management/periods'),
  createPeriod: (body: unknown) => apiClient<AcademicPeriod>('/management/periods', { method: 'POST', body: JSON.stringify(body) }),
  updatePeriod: (id: string, body: unknown) => apiClient<AcademicPeriod>(`/management/periods/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deletePeriod: (id: string) => apiClient(`/management/periods/${id}`, { method: 'DELETE' }),
};
