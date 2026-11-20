const MINIMUM_JWT_SECRET_LENGTH = 32;
const MINIMUM_CSRF_SECRET_LENGTH = 32;

/**
 * Validates configuration before Nest creates application providers. Secrets are
 * intentionally never included in error messages or logs.
 */
export function validateEnvironment(config: Record<string, unknown>) {
  const accessSecret = config.JWT_ACCESS_SECRET;

  if (typeof accessSecret !== 'string' || accessSecret.trim().length < MINIMUM_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_ACCESS_SECRET wajib diatur dan minimal ${MINIMUM_JWT_SECRET_LENGTH} karakter.`,
    );
  }

  const csrfSecret = config.CSRF_SECRET;
  if (typeof csrfSecret !== 'string' || csrfSecret.trim().length < MINIMUM_CSRF_SECRET_LENGTH) {
    throw new Error(`CSRF_SECRET wajib diatur dan minimal ${MINIMUM_CSRF_SECRET_LENGTH} karakter.`);
  }

  const origins = config.FRONTEND_ORIGINS;
  if (config.NODE_ENV === 'production' && (typeof origins !== 'string' || origins.trim() === '')) {
    throw new Error('FRONTEND_ORIGINS wajib diatur pada production.');
  }

  return config;
}
