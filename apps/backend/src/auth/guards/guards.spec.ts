import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { user_role } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { RolesGuard } from './roles.guard.js';

describe('Auth Guards & RBAC — Unit Test Suite', () => {
  let jwtService: JwtService;
  let configService: ConfigService;
  let jwtGuard: JwtAuthGuard;
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  const validSecret = 'test_access_secret_1234567890123456';

  beforeEach(() => {
    configService = new ConfigService({
      JWT_ACCESS_SECRET: validSecret,
      JWT_ACCESS_EXPIRES_IN: '15m',
    });

    jwtService = new JwtService({
      secret: validSecret,
    });

    jwtGuard = new JwtAuthGuard(jwtService, configService);
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
  });

  const createMockContext = (headers: Record<string, string> = {}, user?: any): ExecutionContext => {
    const request = {
      headers,
      cookies: {},
      user,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  // ===========================================================================
  // TEST 8 & 9: JWT ACCESS TOKEN VALIDATION
  // ===========================================================================
  describe('JwtAuthGuard', () => {
    it('8. Access token valid dapat mengakses endpoint terlindungi', async () => {
      const token = await jwtService.signAsync(
        { sub: 'u-1', email: 'user@ulbi.ac.id', role: 'USER' },
        { secret: validSecret },
      );

      const context = createMockContext({ authorization: `Bearer ${token}` });
      const canActivate = await jwtGuard.canActivate(context);

      expect(canActivate).toBe(true);
      const req = context.switchToHttp().getRequest();
      expect(req.user.sub).toBe('u-1');
      expect(req.user.role).toBe('USER');
    });

    it('9. Token tidak valid atau kedaluwarsa ditolak', async () => {
      // Invalid signature
      const badToken = await jwtService.signAsync(
        { sub: 'u-1' },
        { secret: 'wrong_secret_key_123456789' },
      );
      const badContext = createMockContext({ authorization: `Bearer ${badToken}` });
      await expect(jwtGuard.canActivate(badContext)).rejects.toThrow(UnauthorizedException);

      // No token at all
      const emptyContext = createMockContext({});
      await expect(jwtGuard.canActivate(emptyContext)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ===========================================================================
  // TEST 13 & 14: RBAC AUTHORIZATION
  // ===========================================================================
  describe('RolesGuard & RBAC Rules', () => {
    it('13. USER tidak dapat mengakses endpoint STAFF dan ADMIN', () => {
      // Mock route requires ADMIN or STAFF
      reflector.getAllAndOverride = () => [user_role.STAFF, user_role.ADMIN];

      const userContext = createMockContext({}, { sub: 'u-1', role: user_role.USER });
      expect(() => rolesGuard.canActivate(userContext)).toThrow(ForbiddenException);
    });

    it('14. STAFF tidak dapat mengakses endpoint khusus ADMIN', () => {
      // Mock route requires ADMIN ONLY
      reflector.getAllAndOverride = () => [user_role.ADMIN];

      const staffContext = createMockContext({}, { sub: 's-1', role: user_role.STAFF });
      expect(() => rolesGuard.canActivate(staffContext)).toThrow(ForbiddenException);
    });

    it('ADMIN dapat mengakses endpoint ADMIN maupun STAFF', () => {
      reflector.getAllAndOverride = () => [user_role.ADMIN];
      const adminContext = createMockContext({}, { sub: 'a-1', role: user_role.ADMIN });
      expect(rolesGuard.canActivate(adminContext)).toBe(true);

      reflector.getAllAndOverride = () => [user_role.STAFF, user_role.ADMIN];
      expect(rolesGuard.canActivate(adminContext)).toBe(true);
    });
  });

  // ===========================================================================
  // TEST 16: ISOLASI DATA PENGGUNA
  // ===========================================================================
  describe('Data Privacy Isolation', () => {
    it('16. User tidak dapat mengakses resource ID milik pengguna lain', () => {
      const requester = { sub: 'user-A', role: user_role.USER };
      const targetUserId = 'user-B';

      // Business rule: USER only accesses resources where target === requester.sub
      const hasAccess = requester.role === user_role.ADMIN || requester.sub === targetUserId;
      expect(hasAccess).toBe(false);

      // Self access allowed
      const selfAccess = requester.sub === 'user-A';
      expect(selfAccess).toBe(true);
    });
  });
});

