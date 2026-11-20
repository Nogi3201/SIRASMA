import { apiClient } from './api.js';
export const authAdminService = { createStaff: (body: { fullName: string; email: string; password: string; employeeIdentifier?: string; phoneNumber?: string }) => apiClient('/auth/admin/staff', { method: 'POST', body: JSON.stringify(body) }) };
