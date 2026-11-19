import { describe, expect, it } from 'vitest';
import { validateEnvironment } from './environment.validation.js';

describe('validateEnvironment', () => {
  it('rejects a missing JWT access secret', () => {
    expect(() => validateEnvironment({})).toThrow('JWT_ACCESS_SECRET wajib diatur');
  });

  it('rejects a JWT access secret shorter than 32 characters', () => {
    expect(() => validateEnvironment({ JWT_ACCESS_SECRET: 'too-short' })).toThrow(
      'JWT_ACCESS_SECRET wajib diatur',
    );
  });

  it('accepts a JWT access secret with the required minimum length', () => {
    const config = { JWT_ACCESS_SECRET: 'a'.repeat(32) };
    expect(validateEnvironment(config)).toBe(config);
  });
});
