export type UserRole = 'ADMIN' | 'STAFF' | 'USER';

export interface StudentProfile {
  id: string;
  nim: string;
  fullName: string;
  studyProgram: string;
  admissionYear: number;
  activeSemester: number;
  academicStatus: string;
}

export interface StaffProfile {
  id: string;
  employeeIdentifier: string | null;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  studentProfile?: StudentProfile | null;
  staffProfile?: StaffProfile | null;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data: {
    accessToken: string;
    user: User;
  };
}

export interface RegisterStudentPayload {
  nim: string;
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  studyProgram: string;
  admissionYear: number;
  activeSemester: number;
  whatsappNumber: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  identifier: string;
  channel: 'EMAIL' | 'WHATSAPP';
}

export interface ResetPasswordPayload {
  identifier: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

