import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { getAllowedOrigins, getRefreshCookieOptions, isAllowedOrigin } from '../config/security.config.js';
import { normalizePhoneNumber } from './phone-number.js';
import { AuthRateLimitGuard } from './guards/auth-rate-limit.guard.js';
import { CsrfGuard } from './guards/csrf.guard.js';

function contextFor(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('authentication security hardening', () => {
  const config = new ConfigService({
    NODE_ENV: 'production',
    FRONTEND_ORIGINS: 'https://app.example.test,https://admin.example.test',
    CSRF_SECRET: 'c'.repeat(32),
  });

  it('normalizes unambiguous E.164 phone input and rejects invalid local input', () => {
    expect(normalizePhoneNumber(' 00 62-812-3456-7890 ')).toBe('+6281234567890');
    expect(() => normalizePhoneNumber('081234567890')).toThrow('E.164');
  });

  it('allows only configured browser origins', () => {
    expect(getAllowedOrigins(config)).toEqual(['https://app.example.test', 'https://admin.example.test']);
    expect(isAllowedOrigin('https://app.example.test', config)).toBe(true);
    expect(isAllowedOrigin('https://attacker.example', config)).toBe(false);
  });

  it('uses secure HttpOnly cookie attributes in production', () => {
    expect(getRefreshCookieOptions(config)).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/api/auth',
    });
  });

  it('accepts a signed CSRF token from an allowed origin', () => {
    const guard = new CsrfGuard(config);
    const token = guard.createToken();
    const request = {
      get: (name: string) =>
        name === 'origin' ? 'https://app.example.test' : name === 'x-csrf-token' ? token : undefined,
    };
    expect(guard.canActivate(contextFor(request))).toBe(true);
  });

  it('rejects a CSRF request with an invalid token or unapproved origin', () => {
    const guard = new CsrfGuard(config);
    const request = {
      get: (name: string) =>
        name === 'origin' ? 'https://attacker.example' : name === 'x-csrf-token' ? guard.createToken() : undefined,
    };
    expect(() => guard.canActivate(contextFor(request))).toThrow('validasi keamanan');
  });

  it('returns HTTP 429 after the configured rate limit', () => {
    const reflector = {
      getAllAndOverride: () => ({ limit: 1, ttlMs: 60_000 }),
    } as any;
    const guard = new AuthRateLimitGuard(reflector);
    const request = {
      method: 'POST',
      path: '/auth/login',
      route: { path: '/auth/login' },
      socket: { remoteAddress: '127.0.0.1' },
    };
    const context = contextFor(request);

    expect(guard.canActivate(context)).toBe(true);
    try {
      guard.canActivate(context);
      throw new Error('Expected rate limit rejection');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(429);
    }
  });
});
