import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { academic_status, user_role, verification_status } from '@prisma/client';
import * as argon2 from 'argon2';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';
import { MockMailService } from './services/mock-mail.service.js';
import { MockWhatsAppService } from './services/mock-whatsapp.service.js';

describe('AuthService — Unit & Business Rules Test Suite', () => {
  let authService: AuthService;
  let prismaMock: any;
  let jwtService: JwtService;
  let configService: ConfigService;
  let mailService: MockMailService;
  let whatsAppService: MockWhatsAppService;

  beforeEach(() => {
    prismaMock = {
      users: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      student_profiles: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      staff_profiles: {
        create: vi.fn(),
      },
      academic_verifications: {
        create: vi.fn(),
      },
      auth_sessions: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      otp_verifications: {
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(prismaMock)),
    };

    configService = new ConfigService({
      JWT_ACCESS_SECRET: 'test_access_secret_1234567890123456',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_SECRET: 'test_refresh_secret_1234567890123456',
      JWT_REFRESH_EXPIRES_IN: '7d',
    });

    jwtService = new JwtService({
      secret: 'test_access_secret_1234567890123456',
      signOptions: { expiresIn: '15m' },
    });

    mailService = new MockMailService();
    whatsAppService = new MockWhatsAppService();

    authService = new AuthService(
      prismaMock as PrismaService,
      jwtService,
      configService,
      mailService,
      whatsAppService,
    );
  });

  // ===========================================================================
  // TEST 1, 2, 3, 4: REGISTRASI MAHASISWA & ATURAN ROLE
  // ===========================================================================
  describe('Student Registration', () => {
    const validDto = {
      nim: '1214001',
      fullName: 'Ahmad Mahasiswa',
      email: 'ahmad@ulbi.ac.id',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      studyProgram: 'D4 Teknik Informatika',
      admissionYear: 2024,
      activeSemester: 1,
      whatsappNumber: '+6281234567890',
    };

    it('1. Registrasi mahasiswa berhasil dengan status verifikasi awal PENDING', async () => {
      prismaMock.users.findUnique.mockResolvedValue(null);
      prismaMock.student_profiles.findUnique.mockResolvedValue(null);
      prismaMock.users.create.mockResolvedValue({
        id: 'u-1',
        email: validDto.email,
        role: user_role.USER,
      });
      prismaMock.student_profiles.create.mockResolvedValue({
        id: 'sp-1',
        nim: validDto.nim,
        full_name: validDto.fullName,
      });
      prismaMock.academic_verifications.create.mockResolvedValue({
        id: 'av-1',
        status: verification_status.PENDING,
      });

      const res = await authService.registerStudent(validDto);

      expect(res.success).toBe(true);
      expect(prismaMock.users.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'ahmad@ulbi.ac.id',
            role: user_role.USER, // Wajib USER
          }),
        }),
      );
      expect(prismaMock.academic_verifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: verification_status.PENDING,
          }),
        }),
      );
    });

    it('2. Registrasi dengan NIM duplikat ditolak', async () => {
      prismaMock.users.findUnique.mockResolvedValue(null);
      prismaMock.student_profiles.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(authService.registerStudent(validDto)).rejects.toThrow(ConflictException);
    });

    it('3. Registrasi dengan email duplikat ditolak', async () => {
      prismaMock.users.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(authService.registerStudent(validDto)).rejects.toThrow(ConflictException);
    });

    it('4. Registrasi publik tidak dapat menentukan role ADMIN/STAFF (Role selalu USER)', async () => {
      prismaMock.users.findUnique.mockResolvedValue(null);
      prismaMock.student_profiles.findUnique.mockResolvedValue(null);
      prismaMock.users.create.mockImplementation(({ data }) => Promise.resolve({ id: 'u-1', ...data }));
      prismaMock.student_profiles.create.mockResolvedValue({ id: 'sp-1', nim: validDto.nim });
      prismaMock.academic_verifications.create.mockResolvedValue({ id: 'av-1' });

      // Even if someone passed an injected role property, the service hardcodes role to USER
      const forgedDto: any = { ...validDto, role: 'ADMIN' };
      await authService.registerStudent(forgedDto);

      expect(prismaMock.users.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: user_role.USER, // Backend hardcodes USER
          }),
        }),
      );
    });
  });

  // ===========================================================================
  // TEST 5, 6, 7: LOGIN & KEAMANAN AKUN
  // ===========================================================================
  describe('Login & Account Security', () => {
    it('5. Login dengan kredensial benar berhasil menghasilkan tokens & session', async () => {
      const passwordHash = await argon2.hash('Password123!', { type: argon2.argon2id });
      prismaMock.users.findFirst.mockResolvedValue({
        id: 'u-1',
        email: 'ahmad@ulbi.ac.id',
        password_hash: passwordHash,
        role: user_role.USER,
        is_active: true,
        deleted_at: null,
      });

      prismaMock.auth_sessions.create.mockResolvedValue({
        id: 'sess-1',
        user_id: 'u-1',
      });

      const res = await authService.login({
        email: 'ahmad@ulbi.ac.id',
        password: 'Password123!',
      });

      expect(res.success).toBe(true);
      expect(res.data.accessToken).toBeDefined();
      expect(res.data.refreshToken).toContain('sess-1.');
      expect(res.data.user.email).toBe('ahmad@ulbi.ac.id');
    });

    it('6. Login dengan password salah ditolak dengan pesan generik', async () => {
      const passwordHash = await argon2.hash('CorrectPassword123!', { type: argon2.argon2id });
      prismaMock.users.findFirst.mockResolvedValue({
        id: 'u-1',
        email: 'ahmad@ulbi.ac.id',
        password_hash: passwordHash,
        role: user_role.USER,
        is_active: true,
        deleted_at: null,
      });

      await expect(
        authService.login({
          email: 'ahmad@ulbi.ac.id',
          password: 'WrongPassword123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('7. Akun nonaktif atau soft-deleted tidak dapat login', async () => {
      // Inactive
      prismaMock.users.findFirst.mockResolvedValue({
        id: 'u-inactive',
        email: 'inactive@ulbi.ac.id',
        is_active: false,
        deleted_at: null,
      });

      await expect(
        authService.login({
          email: 'inactive@ulbi.ac.id',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);

      // Soft deleted (findFirst returns null because query filters deleted_at: null)
      prismaMock.users.findFirst.mockResolvedValue(null);
      await expect(
        authService.login({
          email: 'deleted@ulbi.ac.id',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ===========================================================================
  // TEST 10, 11, 12: REFRESH TOKEN ROTATION, REUSE DETECTION, & LOGOUT
  // ===========================================================================
  describe('Session Management & Refresh Token Rotation', () => {
    it('10. Refresh token berhasil dirotasi (token lama dicabut, token baru dibuat)', async () => {
      const rawSecret = 'secret_part_123';
      const hash = await argon2.hash(rawSecret, { type: argon2.argon2id });

      const session = {
        id: 'sess-10',
        user_id: 'u-10',
        refresh_token_hash: hash,
        revoked_at: null,
        expires_at: new Date(Date.now() + 1000000),
        users: {
          id: 'u-10',
          email: 'user10@ulbi.ac.id',
          role: user_role.USER,
          is_active: true,
          deleted_at: null,
        },
      };

      prismaMock.auth_sessions.findUnique.mockResolvedValue(session);
      prismaMock.auth_sessions.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.auth_sessions.create.mockResolvedValue({
        id: 'sess-new',
        user_id: 'u-10',
      });

      const res = await authService.refreshTokens(`sess-10.${rawSecret}`);

      expect(res.success).toBe(true);
      expect(prismaMock.auth_sessions.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'sess-10', revoked_at: null }),
          data: expect.objectContaining({ revoked_at: expect.any(Date) }),
        }),
      );
      expect(res.data.refreshToken).toContain('sess-new.');
    });

    it('11. Refresh token yang sudah digunakan ulang ditolak tanpa mencabut sesi lain', async () => {
      const session = {
        id: 'sess-revoked',
        user_id: 'u-victim',
        refresh_token_hash: 'somehash',
        revoked_at: new Date(Date.now() - 5000), // Sudah dicabut sebelumnya!
        expires_at: new Date(Date.now() + 100000),
        users: { id: 'u-victim' },
      };

      prismaMock.auth_sessions.findUnique.mockResolvedValue(session);

      await expect(authService.refreshTokens('sess-revoked.rawSecret')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(prismaMock.auth_sessions.updateMany).not.toHaveBeenCalled();
    });

    it('refresh paralel hanya mengonsumsi token lama sekali dan sesi baru tetap valid', async () => {
      const rawSecret = 'parallel_secret_123';
      const original = {
        id: 'sess-parallel',
        user_id: 'u-parallel',
        refresh_token_hash: await argon2.hash(rawSecret, { type: argon2.argon2id }),
        revoked_at: null as Date | null,
        expires_at: new Date(Date.now() + 1000000),
        users: {
          id: 'u-parallel',
          email: 'parallel@ulbi.ac.id',
          role: user_role.USER,
          is_active: true,
          deleted_at: null,
        },
      };
      const sessions = new Map<string, any>([[original.id, original]]);
      let newSessionNumber = 0;

      prismaMock.auth_sessions.findUnique.mockImplementation(({ where }: any) =>
        Promise.resolve(sessions.get(where.id) ?? null),
      );
      prismaMock.auth_sessions.updateMany.mockImplementation(({ where, data }: any) => {
        const session = sessions.get(where.id);
        if (!session || session.revoked_at !== null) {
          return Promise.resolve({ count: 0 });
        }
        session.revoked_at = data.revoked_at;
        session.last_used_at = data.last_used_at;
        return Promise.resolve({ count: 1 });
      });
      prismaMock.auth_sessions.create.mockImplementation(({ data }: any) => {
        const id = `sess-new-${++newSessionNumber}`;
        sessions.set(id, {
          id,
          ...data,
          revoked_at: null,
          users: original.users,
        });
        return Promise.resolve({ id, ...data });
      });

      const concurrent = await Promise.allSettled([
        authService.refreshTokens(`${original.id}.${rawSecret}`),
        authService.refreshTokens(`${original.id}.${rawSecret}`),
      ]);
      const fulfilled = concurrent.filter(
        (result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled',
      );

      expect(fulfilled).toHaveLength(1);
      expect(prismaMock.auth_sessions.create).toHaveBeenCalledTimes(1);

      await expect(authService.refreshTokens(`${original.id}.${rawSecret}`)).rejects.toThrow(
        UnauthorizedException,
      );

      await expect(authService.refreshTokens(fulfilled[0].value.data.refreshToken)).resolves.toMatchObject({
        success: true,
      });
    });

    it('12. Logout mencabut sesi terkait', async () => {
      await authService.logout('sess-logout.rawToken');

      expect(prismaMock.auth_sessions.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sess-logout', revoked_at: null },
          data: expect.objectContaining({ revoked_at: expect.any(Date) }),
        }),
      );
    });
  });

  // ===========================================================================
  // TEST 15: PASSWORD RESET MENCABUT SELURUH SESI AKTIF
  // ===========================================================================
  describe('Password Reset', () => {
    it('15. Password reset berhasil memverifikasi OTP dan mencabut seluruh sesi aktif', async () => {
      const user = { id: 'u-reset', email: 'reset@ulbi.ac.id', password_hash: 'old' };
      const rawOtp = '123456';
      const otpHash = await argon2.hash(rawOtp, { type: argon2.argon2id });

      prismaMock.users.findFirst.mockResolvedValue(user);
      prismaMock.otp_verifications.findFirst.mockResolvedValue({
        id: 'otp-1',
        user_id: user.id,
        otp_hash: otpHash,
        attempts: 0,
        expires_at: new Date(Date.now() + 100000),
      });

      const res = await authService.resetPassword({
        identifier: user.email,
        otp: rawOtp,
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      });

      expect(res.success).toBe(true);
      expect(prismaMock.auth_sessions.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user_id: user.id, revoked_at: null },
          data: expect.objectContaining({ revoked_at: expect.any(Date) }),
        }),
      );
    });
  });

  describe('User profile response contract', () => {
    it('maps Prisma fields to the public camelCase profile contract', async () => {
      prismaMock.users.findUnique.mockResolvedValue({
        id: 'u-profile',
        email: 'profile@ulbi.ac.id',
        role: user_role.USER,
        phone_number: '+6281234567890',
        is_active: true,
        created_at: new Date('2026-01-01T00:00:00.000Z'),
        student_profiles: {
          id: 'student-profile',
          nim: '1214001',
          full_name: 'Mahasiswa ULBI',
          study_program: 'D4 Teknik Informatika',
          admission_year: 2024,
          active_semester: 5,
          academic_status: academic_status.ACTIVE,
        },
        staff_profiles: null,
      });

      await expect(authService.getUserProfile('u-profile')).resolves.toEqual(
        expect.objectContaining({
          phone: '+6281234567890',
          isActive: true,
          studentProfile: {
            id: 'student-profile',
            nim: '1214001',
            fullName: 'Mahasiswa ULBI',
            studyProgram: 'D4 Teknik Informatika',
            admissionYear: 2024,
            activeSemester: 5,
            academicStatus: academic_status.ACTIVE,
          },
        }),
      );
    });
  });

  describe('Session ownership', () => {
    it('does not allow a user to revoke another user session', async () => {
      prismaMock.auth_sessions.findUnique.mockResolvedValue({
        id: 'session-owned-by-b',
        user_id: 'user-b',
      });

      await expect(authService.revokeSession('user-a', 'session-owned-by-b')).rejects.toThrow(
        'Sesi tidak ditemukan atau Anda tidak memiliki akses',
      );
      expect(prismaMock.auth_sessions.update).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // ADMIN ONLY: CREATE STAFF
  // ===========================================================================
  describe('Staff Creation by Admin', () => {
    it('ADMIN dapat membuat akun STAFF dengan role STAFF yang terkunci', async () => {
      prismaMock.users.findUnique.mockResolvedValue(null);
      prismaMock.users.create.mockResolvedValue({
        id: 'u-staff',
        email: 'staff@ulbi.ac.id',
        role: user_role.STAFF,
      });
      prismaMock.staff_profiles.create.mockResolvedValue({
        id: 'sp-1',
        employee_identifier: 'EMP001',
      });

      const res = await authService.createStaff({
        fullName: 'Budi Staff',
        email: 'staff@ulbi.ac.id',
        password: 'Password123!',
        employeeIdentifier: 'EMP001',
      });

      expect(res.success).toBe(true);
      expect(res.data.role).toBe(user_role.STAFF);
      expect(prismaMock.users.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: user_role.STAFF }),
        }),
      );
    });
  });
});

