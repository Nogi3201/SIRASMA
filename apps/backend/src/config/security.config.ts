import type { ConfigService } from '@nestjs/config';

const DEVELOPMENT_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

export type SameSite = 'lax' | 'strict' | 'none';

export function getAllowedOrigins(configService: ConfigService): string[] {
  const configured = configService.get<string>('FRONTEND_ORIGINS')?.trim();
  if (!configured) {
    return configService.get<string>('NODE_ENV') === 'production' ? [] : DEVELOPMENT_ORIGINS;
  }

  return [...new Set(configured.split(',').map((origin) => origin.trim()).filter(Boolean))];
}

export function isAllowedOrigin(origin: string | undefined, configService: ConfigService): boolean {
  return Boolean(origin && getAllowedOrigins(configService).includes(origin));
}

export function getRefreshCookieOptions(configService: ConfigService) {
  const environment = configService.get<string>('NODE_ENV', 'development');
  const configuredSameSite = configService.get<string>('AUTH_COOKIE_SAME_SITE', 'lax').toLowerCase();
  const sameSite: SameSite = ['lax', 'strict', 'none'].includes(configuredSameSite)
    ? (configuredSameSite as SameSite)
    : 'lax';

  return {
    httpOnly: true,
    secure: environment === 'production' || sameSite === 'none',
    sameSite,
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  } as const;
}
