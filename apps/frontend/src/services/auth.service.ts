import { apiClient, setAccessToken } from './api.js';
import type {
  AuthResponse,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterStudentPayload,
  ResetPasswordPayload,
  User,
} from '../types/auth.js';

export const authService = {
  async register(payload: RegisterStudentPayload) {
    return apiClient<{ success: boolean; message: string; data: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
      requiresAuth: false,
    });
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const res = await apiClient<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
      requiresAuth: false,
    });

    if (res.data?.accessToken) {
      setAccessToken(res.data.accessToken);
    }

    return res;
  },

  async getProfile(): Promise<{ success: boolean; data: User }> {
    return apiClient<{ success: boolean; data: User }>('/auth/me', {
      method: 'GET',
    });
  },

  async refreshToken(): Promise<{ success: boolean; data: { accessToken: string } }> {
    const res = await apiClient<{ success: boolean; data: { accessToken: string } }>('/auth/refresh', {
      method: 'POST',
      requiresAuth: false,
    });

    if (res.data?.accessToken) {
      setAccessToken(res.data.accessToken);
    }

    return res;
  },

  async logout(): Promise<void> {
    try {
      await apiClient('/auth/logout', {
        method: 'POST',
        requiresAuth: false,
      });
    } finally {
      setAccessToken(null);
    }
  },

  async forgotPassword(payload: ForgotPasswordPayload) {
    return apiClient<{ success: boolean; message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(payload),
      requiresAuth: false,
    });
  },

  async resetPassword(payload: ResetPasswordPayload) {
    return apiClient<{ success: boolean; message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
      requiresAuth: false,
    });
  },
};

