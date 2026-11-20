import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { user_role } from '@prisma/client';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import type { AuthenticatedUser } from './decorators/current-user.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { RateLimit } from './decorators/rate-limit.decorator.js';
import { Roles } from './decorators/roles.decorator.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterStudentDto } from './dto/register-student.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { AuthRateLimitGuard } from './guards/auth-rate-limit.guard.js';
import { CsrfGuard } from './guards/csrf.guard.js';
import { getRefreshCookieOptions } from '../config/security.config.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly csrfGuard: CsrfGuard,
    private readonly configService: ConfigService,
  ) {}

  // ===========================================================================
  // 1. REGISTRASI MAHASISWA
  // ===========================================================================
  @Post('register')
  @UseGuards(AuthRateLimitGuard)
  @RateLimit({ limit: 5, ttlMs: 60 * 60 * 1000 })
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterStudentDto) {
    return this.authService.registerStudent(dto);
  }

  // ===========================================================================
  // 2. LOGIN
  // ===========================================================================
  @Post('login')
  @UseGuards(AuthRateLimitGuard)
  @RateLimit({ limit: 10, ttlMs: 15 * 60 * 1000 })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await this.authService.login(dto, ip, userAgent);

    // Set refresh token ke HttpOnly Cookie yang aman
    this.setRefreshTokenCookie(res, result.data.refreshToken);

    return {
      success: true,
      message: result.message,
      data: {
        accessToken: result.data.accessToken,
        user: result.data.user,
      },
    };
  }

  // ===========================================================================
  // 3. REFRESH TOKEN
  // ===========================================================================
  @Get('csrf')
  @UseGuards(AuthRateLimitGuard)
  @RateLimit({ limit: 60, ttlMs: 60 * 1000 })
  getCsrfToken() {
    return { success: true, data: { csrfToken: this.csrfGuard.createToken() } };
  }

  @Post('refresh')
  @UseGuards(CsrfGuard, AuthRateLimitGuard)
  @RateLimit({ limit: 30, ttlMs: 60 * 1000 })
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body('refreshToken') bodyToken?: string,
  ) {
    const cookieToken = req.cookies?.refresh_token;
    const tokenToUse = cookieToken || bodyToken;

    const ip = (req.headers['x-forwarded-for'] as string) || req.ip;
    const userAgent = req.headers['user-agent'];

    const result = await this.authService.refreshTokens(tokenToUse, ip, userAgent);

    this.setRefreshTokenCookie(res, result.data.refreshToken);

    return {
      success: true,
      message: result.message,
      data: {
        accessToken: result.data.accessToken,
      },
    };
  }

  // ===========================================================================
  // 4. LOGOUT
  // ===========================================================================
  @Post('logout')
  @UseGuards(CsrfGuard, AuthRateLimitGuard)
  @RateLimit({ limit: 30, ttlMs: 60 * 1000 })
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body('refreshToken') bodyToken?: string,
  ) {
    const cookieToken = req.cookies?.refresh_token;
    const tokenToUse = cookieToken || bodyToken;

    await this.authService.logout(tokenToUse);

    // Bersihkan cookie
    this.clearRefreshTokenCookie(res);

    return {
      success: true,
      message: 'Logout berhasil. Sesi telah diakhiri.',
    };
  }

  // ===========================================================================
  // 5. PASSWORD RECOVERY
  // ===========================================================================
  @Post('forgot-password')
  @UseGuards(AuthRateLimitGuard)
  @RateLimit({ limit: 3, ttlMs: 15 * 60 * 1000 })
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('reset-password')
  @UseGuards(AuthRateLimitGuard)
  @RateLimit({ limit: 5, ttlMs: 15 * 60 * 1000 })
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // ===========================================================================
  // 6. PROTECTED ENDPOINTS (Current User)
  // ===========================================================================
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser('sub') userId: string) {
    const user = await this.authService.getUserProfile(userId);
    return {
      success: true,
      data: user,
    };
  }

  @Patch('profile/student')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(user_role.USER)
  async updateStudentProfile(@CurrentUser('sub') userId: string, @Body() dto: UpdateStudentProfileDto) {
    return this.authService.updateStudentProfile(userId, dto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard, AuthRateLimitGuard)
  @RateLimit({ limit: 5, ttlMs: 15 * 60 * 1000 })
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.changePassword(userId, dto);
    this.clearRefreshTokenCookie(res);
    return result;
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async getSessions(@CurrentUser('sub') userId: string) {
    const sessions = await this.authService.getUserSessions(userId);
    return {
      success: true,
      data: sessions,
    };
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  async revokeSession(
    @CurrentUser('sub') userId: string,
    @Param('id') sessionId: string,
  ) {
    return this.authService.revokeSession(userId, sessionId);
  }

  // ===========================================================================
  // 7. ADMIN MANAGEMENT: CREATE STAFF
  // ===========================================================================
  @Post('admin/staff')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(user_role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createStaff(@Body() dto: CreateStaffDto) {
    return this.authService.createStaff(dto);
  }

  // ===========================================================================
  // 8. RBAC VERIFICATION TEST ENDPOINTS
  // ===========================================================================
  @Get('test/user')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_role.USER)
  testUserAccess(@CurrentUser() user: AuthenticatedUser) {
    return {
      success: true,
      message: 'Akses USER mahasiswa terverifikasi.',
      user,
    };
  }

  @Get('test/staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_role.STAFF, user_role.ADMIN)
  testStaffAccess(@CurrentUser() user: AuthenticatedUser) {
    return {
      success: true,
      message: 'Akses STAFF operasional terverifikasi.',
      user,
    };
  }

  @Get('test/admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_role.ADMIN)
  testAdminAccess(@CurrentUser() user: AuthenticatedUser) {
    return {
      success: true,
      message: 'Akses ADMIN pengelolaan sistem terverifikasi.',
      user,
    };
  }

  // ===========================================================================
  // HELPER: Cookie Configuration
  // ===========================================================================
  private setRefreshTokenCookie(res: Response, token: string) {
    res.cookie('refresh_token', token, getRefreshCookieOptions(this.configService));
  }

  private clearRefreshTokenCookie(res: Response) {
    const { maxAge: _maxAge, ...options } = getRefreshCookieOptions(this.configService);
    res.clearCookie('refresh_token', options);
  }
}
