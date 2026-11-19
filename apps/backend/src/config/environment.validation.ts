const MINIMUM_JWT_SECRET_LENGTH = 32;

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

  return config;
}
