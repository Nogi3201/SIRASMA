import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  academic_status,
  otp_channel,
  otp_purpose,
  user_role,
  verification_status,
  Prisma,
} from '@prisma/client';
import * as argon2 from 'argon2';
import * as crypto from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterStudentDto } from './dto/register-student.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { MockMailService } from './services/mock-mail.service.js';
import { MockWhatsAppService } from './services/mock-whatsapp.service.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MockMailService,
    private readonly whatsAppService: MockWhatsAppService,
  ) {}

  // ===========================================================================
  // 1. REGISTRASI MAHASISWA (Public)
  // ===========================================================================
  async registerStudent(dto: RegisterStudentDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Password dan konfirmasi password tidak cocok.');
    }

    const email = dto.email.toLowerCase().trim();
    const nim = dto.nim.trim();

    // Periksa keunikan email
    const existingUser = await this.prisma.users.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Email sudah terdaftar dalam sistem.');
    }

    // Periksa keunikan NIM
    const existingStudent = await this.prisma.student_profiles.findUnique({
      where: { nim },
    });
    if (existingStudent) {
      throw new ConflictException('NIM sudah terdaftar dalam sistem.');
    }

    // Periksa keunikan nomor WhatsApp
    const existingPhone = await this.prisma.users.findFirst({
      where: { phone_number: dto.whatsappNumber.trim() },
    });
    if (existingPhone) {
      throw new ConflictException('Nomor WhatsApp sudah terdaftar dalam sistem.');
    }

    // Hash password menggunakan Argon2id
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Buat user utama - ROLE DIKUNCI KE 'USER' (MAHASISWA)
        const user = await tx.users.create({
          data: {
            email,
            phone_number: dto.whatsappNumber.trim(),
            password_hash: passwordHash,
            role: user_role.USER,
            is_active: true,
          },
        });

        // Buat profil mahasiswa
        const studentProfile = await tx.student_profiles.create({
          data: {
            user_id: user.id,
            nim,
            full_name: dto.fullName.trim(),
            study_program: dto.studyProgram.trim(),
            admission_year: dto.admissionYear,
            active_semester: dto.activeSemester,
            academic_status: academic_status.UNKNOWN,
          },
        });

        // Inisialisasi status verifikasi akademik (PENDING)
        await tx.academic_verifications.create({
          data: {
            student_id: studentProfile.id,
            status: verification_status.PENDING,
            notes: 'Pendaftaran mandiri mahasiswa baru.',
          },
        });

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          nim: studentProfile.nim,
          fullName: studentProfile.full_name,
        };
      });

      return {
        success: true,
        message: 'Registrasi mahasiswa berhasil. Silakan login ke akun Anda.',
        data: result,
      };
    } catch (error: any) {
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      if (error?.code === 'P2002') {
        const target = error?.meta?.target;
        if (Array.isArray(target) && target.includes('phone_number')) {
          throw new ConflictException('Nomor WhatsApp sudah terdaftar dalam sistem.');
        }
        if (Array.isArray(target) && target.includes('email')) {
          throw new ConflictException('Email sudah terdaftar dalam sistem.');
        }
        if (Array.isArray(target) && target.includes('nim')) {
          throw new ConflictException('NIM sudah terdaftar dalam sistem.');
        }
        throw new ConflictException('Data identitas (email/NIM/telepon) sudah terdaftar.');
      }
      this.logger.error('Error saat registrasi mahasiswa:', error);
      throw new InternalServerErrorException('Gagal memproses registrasi mahasiswa.');
    }
  }

  // ===========================================================================
  // 2. LOGIN (Public)
  // ===========================================================================
  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const email = dto.email.toLowerCase().trim();

    // Cari user aktif (tidak soft-deleted)
    const user = await this.prisma.users.findFirst({
      where: {
        email,
        deleted_at: null,
      },
      include: {
        student_profiles: true,
        staff_profiles: true,
      },
    });

    // Cegah user enumeration dengan pesan generik
    if (!user || !user.is_active) {
      // Jalankan verifikasi dummy untuk mencegah side-channel timing attack
      await argon2.hash('dummy-timing-protection');
      throw new UnauthorizedException('Email atau password salah.');
    }

    const isPasswordValid = await argon2.verify(user.password_hash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email atau password salah.');
    }

    // Buat session dan refresh token baru
    const { accessToken, refreshToken, sessionId } = await this.createSession(
      user.id,
      user.email,
      user.role,
      ipAddress,
      userAgent,
    );

    return {
      success: true,
      message: 'Login berhasil.',
      data: {
        accessToken,
        refreshToken,
        sessionId,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          phone: user.phone_number,
          studentProfile: user.student_profiles
            ? {
                id: user.student_profiles.id,
                nim: user.student_profiles.nim,
                fullName: user.student_profiles.full_name,
                studyProgram: user.student_profiles.study_program,
                activeSemester: user.student_profiles.active_semester,
                admissionYear: user.student_profiles.admission_year,
                academicStatus: user.student_profiles.academic_status,
              }
            : null,
          staffProfile: user.staff_profiles
            ? {
                id: user.staff_profiles.id,
                employeeIdentifier: user.staff_profiles.employee_identifier,
              }
            : null,
        },
      },
    };
  }

  // ===========================================================================
  // 3. REFRESH TOKEN DENGAN ROTASI DAN REUSE DETECTION
  // ===========================================================================
  async refreshTokens(compositeToken: string, ipAddress?: string, userAgent?: string) {
    if (!compositeToken || !compositeToken.includes('.')) {
      throw new UnauthorizedException('Refresh token tidak valid atau berformat salah.');
    }

    const [sessionId, rawSecret] = compositeToken.split('.');
    if (!sessionId || !rawSecret) {
      throw new UnauthorizedException('Format token tidak valid.');
    }

    const session = await this.prisma.auth_sessions.findUnique({
      where: { id: sessionId },
      include: { users: true },
    });

    if (!session) {
      throw new UnauthorizedException('Sesi tidak ditemukan.');
    }

    // A revoked token is a replay/reuse attempt. Do not revoke every session
    // here: an indistinguishable concurrent browser request could otherwise log
    // the user out globally. The atomic consume below ensures this token can
    // never create another active session.
    if (session.revoked_at !== null) {
      this.logger.warn(
        `[SECURITY WARNING] Percobaan penggunaan ulang refresh token terdeteksi untuk user ${session.user_id}.`,
      );
      throw new UnauthorizedException(
        'Refresh token telah digunakan atau tidak lagi valid. Silakan gunakan sesi terbaru.',
      );
    }

    // Periksa masa berlaku
    if (new Date() > session.expires_at) {
      await this.prisma.auth_sessions.update({
        where: { id: session.id },
        data: { revoked_at: new Date() },
      });
      throw new UnauthorizedException('Sesi telah kedaluwarsa. Silakan login kembali.');
    }

    // Verifikasi hash token
    const isTokenMatch = await argon2.verify(session.refresh_token_hash, rawSecret);
    if (!isTokenMatch) {
      throw new UnauthorizedException('Kredensial token tidak cocok.');
    }

    // Periksa status akun user
    if (!session.users.is_active || session.users.deleted_at !== null) {
      await this.prisma.auth_sessions.update({
        where: { id: session.id },
        data: { revoked_at: new Date() },
      });
      throw new UnauthorizedException('Akun pengguna telah dinonaktifkan.');
    }

    // Atomically consume the old token. The conditional update is the
    // concurrency boundary: only one request can change revoked_at from null.
    const newTokens = await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.auth_sessions.updateMany({
        where: {
          id: session.id,
          revoked_at: null,
          expires_at: { gt: new Date() },
        },
        data: {
          revoked_at: new Date(),
          last_used_at: new Date(),
        },
      });

      if (consumed.count !== 1) {
        this.logger.warn(
          `[SECURITY WARNING] Refresh token replay rejected for user ${session.user_id}.`,
        );
        throw new UnauthorizedException('Refresh token telah digunakan atau tidak lagi valid.');
      }

      return this.createSession(
        session.user_id,
        session.users.email,
        session.users.role,
        ipAddress,
        userAgent,
        tx,
      );
    });

    return {
      success: true,
      message: 'Token berhasil dirotasi.',
      data: newTokens,
    };
  }

  // ===========================================================================
  // 4. LOGOUT & PENCABUTAN SESI
  // ===========================================================================
  async logout(compositeToken?: string, currentSessionId?: string) {
    let targetSessionId = currentSessionId;

    if (!targetSessionId && compositeToken && compositeToken.includes('.')) {
      targetSessionId = compositeToken.split('.')[0];
    }

    if (targetSessionId) {
      await this.prisma.auth_sessions.updateMany({
        where: {
          id: targetSessionId,
          revoked_at: null,
        },
        data: {
          revoked_at: new Date(),
        },
      });
    }

    return {
      success: true,
      message: 'Logout berhasil. Sesi telah dicabut.',
    };
  }

  async revokeSession(userId: string, targetSessionId: string) {
    const session = await this.prisma.auth_sessions.findUnique({
      where: { id: targetSessionId },
    });

    if (!session || session.user_id !== userId) {
      throw new NotFoundException('Sesi tidak ditemukan atau Anda tidak memiliki akses.');
    }

    await this.prisma.auth_sessions.update({
      where: { id: targetSessionId },
      data: { revoked_at: new Date() },
    });

    return {
      success: true,
      message: 'Sesi berhasil dicabut.',
    };
  }

  async revokeAllUserSessions(userId: string) {
    await this.prisma.auth_sessions.updateMany({
      where: {
        user_id: userId,
        revoked_at: null,
      },
      data: {
        revoked_at: new Date(),
      },
    });
  }

  // ===========================================================================
  // 5. PASSWORD RECOVERY (Forgot & Reset)
  // ===========================================================================
  async requestPasswordReset(dto: ForgotPasswordDto) {
    const identifier = dto.identifier.toLowerCase().trim();

    const user = await this.prisma.users.findFirst({
      where: {
        OR: [{ email: identifier }, { phone_number: identifier }],
        deleted_at: null,
        is_active: true,
      },
    });

    // Respons generik agar tidak membocorkan keberadaan akun
    const genericResponse = {
      success: true,
      message: 'Jika akun terdaftar, kode verifikasi OTP telah dikirimkan ke tujuan Anda.',
    };

    if (!user) {
      return genericResponse;
    }

    // Generate 6 digit numeric OTP
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const otpHash = await argon2.hash(rawOtp, { type: argon2.argon2id });
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 menit

    // Simpan OTP ke database
    await this.prisma.otp_verifications.create({
      data: {
        user_id: user.id,
        purpose: otp_purpose.PASSWORD_RESET,
        channel: dto.channel,
        destination: dto.channel === otp_channel.EMAIL ? user.email : (user.phone_number ?? identifier),
        otp_hash: otpHash,
        expires_at: expiresAt,
        attempts: 0,
      },
    });

    // Dispatch via Abstraction Service
    if (dto.channel === otp_channel.EMAIL) {
      await this.mailService.sendMail({
        to: user.email,
        subject: 'SIRASMA — Kode Verifikasi Reset Password',
        content: `Kode verifikasi Anda adalah: ${rawOtp}. Berlaku selama 15 menit.`,
      });
    } else {
      await this.whatsAppService.sendMessage({
        to: user.phone_number ?? identifier,
        message: `SIRASMA: Kode verifikasi reset password Anda adalah ${rawOtp}. Berlaku 15 menit.`,
      });
    }

    return genericResponse;
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Password baru dan konfirmasi tidak cocok.');
    }

    const identifier = dto.identifier.toLowerCase().trim();

    // Cari user
    const user = await this.prisma.users.findFirst({
      where: {
        OR: [{ email: identifier }, { phone_number: identifier }],
        deleted_at: null,
      },
    });

    if (!user) {
      throw new BadRequestException('Permintaan reset password tidak valid atau sudah kedaluwarsa.');
    }

    // Cari record OTP terbaru yang belum diverifikasi dan belum kedaluwarsa
    const latestOtp = await this.prisma.otp_verifications.findFirst({
      where: {
        user_id: user.id,
        purpose: otp_purpose.PASSWORD_RESET,
        verified_at: null,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!latestOtp) {
      throw new BadRequestException('Kode OTP tidak valid atau telah kedaluwarsa. Silakan ajukan ulang.');
    }

    // Batas percobaan: maksimal 5 kali
    if (latestOtp.attempts >= 5) {
      throw new BadRequestException('Batas maksimal percobaan OTP telah tercapai. Silakan ajukan kode baru.');
    }

    const isMatch = await argon2.verify(latestOtp.otp_hash, dto.otp);
    if (!isMatch) {
      await this.prisma.otp_verifications.update({
        where: { id: latestOtp.id },
        data: { attempts: latestOtp.attempts + 1 },
      });
      throw new BadRequestException('Kode OTP salah.');
    }

    // Validasi berhasil
    const newPasswordHash = await argon2.hash(dto.newPassword, { type: argon2.argon2id });

    await this.prisma.$transaction(async (tx) => {
      // Tandai OTP telah digunakan
      await tx.otp_verifications.update({
        where: { id: latestOtp.id },
        data: { verified_at: new Date() },
      });

      // Update password
      await tx.users.update({
        where: { id: user.id },
        data: { password_hash: newPasswordHash },
      });

      // CABUT SELURUH SESI AKTIF PENGGUNA
      await tx.auth_sessions.updateMany({
        where: {
          user_id: user.id,
          revoked_at: null,
        },
        data: { revoked_at: new Date() },
      });
    });

    return {
      success: true,
      message: 'Password berhasil diubah. Seluruh sesi aktif telah dicabut. Silakan login kembali.',
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Password baru dan konfirmasi tidak cocok.');
    }

    const user = await this.prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan.');
    }

    const isCurrentValid = await argon2.verify(user.password_hash, dto.currentPassword);
    if (!isCurrentValid) {
      throw new BadRequestException('Password saat ini salah.');
    }

    const newHash = await argon2.hash(dto.newPassword, { type: argon2.argon2id });

    await this.prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { id: userId },
        data: { password_hash: newHash },
      });

      // Cabut semua sesi aktif
      await tx.auth_sessions.updateMany({
        where: {
          user_id: userId,
          revoked_at: null,
        },
        data: { revoked_at: new Date() },
      });
    });

    return {
      success: true,
      message: 'Password berhasil diperbarui. Seluruh sesi lain telah dicabut.',
    };
  }

  // ===========================================================================
  // 6. MANAJEMEN PENGGUNA OLEH ADMIN (Create Staff)
  // ===========================================================================
  async createStaff(dto: CreateStaffDto) {
    const email = dto.email.toLowerCase().trim();

    const existingUser = await this.prisma.users.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Email staf sudah terdaftar.');
    }

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.users.create({
        data: {
          email,
          phone_number: dto.phoneNumber?.trim() ?? null,
          password_hash: passwordHash,
          role: user_role.STAFF, // Dikunci ke role STAFF
          is_active: true,
        },
      });

      const staffProfile = await tx.staff_profiles.create({
        data: {
          user_id: user.id,
          employee_identifier: dto.employeeIdentifier?.trim() ?? null,
        },
      });

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: dto.fullName.trim(),
        employeeIdentifier: staffProfile.employee_identifier,
      };
    });

    return {
      success: true,
      message: 'Akun staf operasional berhasil dibuat.',
      data: result,
    };
  }

  // ===========================================================================
  // 7. GET PROFILE & SESSIONS
  // ===========================================================================
  async getUserProfile(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: {
        student_profiles: true,
        staff_profiles: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan.');
    }

    return this.toUserResponse(user);
  }

  async getUserSessions(userId: string) {
    const sessions = await this.prisma.auth_sessions.findMany({
      where: {
        user_id: userId,
        revoked_at: null,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        ip_address: true,
        user_agent: true,
        created_at: true,
        last_used_at: true,
        expires_at: true,
      },
    });

    return sessions;
  }

  // ===========================================================================
  // HELPER: CREATE SESSION & GENERATE TOKENS
  // ===========================================================================
  private async createSession(
    userId: string,
    email: string,
    role: string,
    ipAddress?: string,
    userAgent?: string,
    prisma: Pick<PrismaService, 'auth_sessions'> = this.prisma,
  ) {
    const accessSecret = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    const accessExpiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
    // The refresh token is an opaque database token, so its lifetime is
    // deliberately fixed here and aligned with the HttpOnly cookie lifetime.
    const refreshDurationMs = 7 * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + refreshDurationMs);

    // Raw token rahasia acak 40 bytes
    const rawSecret = crypto.randomBytes(40).toString('hex');
    const refreshHash = await argon2.hash(rawSecret, { type: argon2.argon2id });

    // Simpan ke database
    const session = await prisma.auth_sessions.create({
      data: {
        user_id: userId,
        refresh_token_hash: refreshHash,
        ip_address: ipAddress ?? null,
        user_agent: userAgent ?? null,
        expires_at: expiresAt,
      },
    });

    // Format composite token: {sessionId}.{rawSecret}
    const compositeRefreshToken = `${session.id}.${rawSecret}`;

    // Buat JWT access token
    const accessToken = await this.jwtService.signAsync(
      {
        sub: userId,
        email,
        role,
        sessionId: session.id,
      },
      {
        secret: accessSecret,
        expiresIn: accessExpiresIn as any,
      },
    );

    return {
      accessToken,
      refreshToken: compositeRefreshToken,
      sessionId: session.id,
      expiresAt,
    };
  }

  private toUserResponse(user: Prisma.usersGetPayload<{
    include: { student_profiles: true; staff_profiles: true };
  }>) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      phone: user.phone_number,
      isActive: user.is_active,
      createdAt: user.created_at,
      studentProfile: user.student_profiles
        ? {
            id: user.student_profiles.id,
            nim: user.student_profiles.nim,
            fullName: user.student_profiles.full_name,
            studyProgram: user.student_profiles.study_program,
            admissionYear: user.student_profiles.admission_year,
            activeSemester: user.student_profiles.active_semester,
            academicStatus: user.student_profiles.academic_status,
          }
        : null,
      staffProfile: user.staff_profiles
        ? {
            id: user.staff_profiles.id,
            employeeIdentifier: user.staff_profiles.employee_identifier,
          }
        : null,
    };
  }
}
