import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { user_role } from '@prisma/client';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import type { AuthenticatedUser } from './decorators/current-user.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Roles } from './decorators/roles.decorator.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterStudentDto } from './dto/register-student.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ===========================================================================
  // 1. REGISTRASI MAHASISWA
  // ===========================================================================
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterStudentDto) {
    return this.authService.registerStudent(dto);
  }

  // ===========================================================================
  // 2. LOGIN
  // ===========================================================================
  @Post('login')
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
  @Post('refresh')
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
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
    });

    return {
      success: true,
      message: 'Logout berhasil. Sesi telah diakhiri.',
    };
  }

  // ===========================================================================
  // 5. PASSWORD RECOVERY
  // ===========================================================================
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('reset-password')
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

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.changePassword(userId, dto);
    res.clearCookie('refresh_token', { path: '/api/auth' });
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
  @UseGuards(JwtAuthGuard, RolesGuard)
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
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
    });
  }
}
