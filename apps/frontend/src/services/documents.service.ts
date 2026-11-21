import { apiClient, getAccessToken } from './api.js';
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
export type StudentDocument = { id: string; document_type: 'KTP' | 'KTM'; status: string; rejection_reason?: string | null; uploaded_at: string; reviewed_at?: string | null; users_student_documents_user_idTousers?: { email: string; student_profiles?: { full_name: string; nim: string } | null } };
export const documentsService = {
  mine: () => apiClient<StudentDocument[]>('/documents/mine'),
  all: () => apiClient<StudentDocument[]>('/documents'),
  upload: (documentType: 'KTP' | 'KTM', fileName: string, fileBase64: string) => apiClient<StudentDocument>('/documents', { method: 'POST', body: JSON.stringify({ documentType, fileName, fileBase64 }) }),
  review: (id: string, status: 'APPROVED' | 'REJECTED', reason?: string) => apiClient<StudentDocument>(`/documents/${id}/review`, { method: 'PATCH', body: JSON.stringify({ status, reason }) }),
  openFile: async (id: string) => { const response = await fetch(`${BASE_URL}/documents/${id}/file`, { credentials: 'include', headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` } }); if (!response.ok) throw new Error('Dokumen tidak dapat dibuka.'); return URL.createObjectURL(await response.blob()); },
};
