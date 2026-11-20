import { BadRequestException } from '@nestjs/common';

const E164_PHONE_NUMBER = /^\+[1-9]\d{7,14}$/;

/** Normalizes only unambiguous international input; local prefixes need country context. */
export function normalizePhoneNumber(value: string): string {
  const compact = value.trim().replace(/[\s().-]/g, '');
  const international = compact.startsWith('00') ? `+${compact.slice(2)}` : compact;

  if (!E164_PHONE_NUMBER.test(international)) {
    throw new BadRequestException('Nomor telepon harus menggunakan format internasional E.164 yang valid.');
  }
  return international;
}

/** Supports lookup of legacy values without rewriting existing database records. */
export function normalizePhoneNumberForLookup(value: string): string {
  try {
    return normalizePhoneNumber(value);
  } catch {
    return value.trim();
  }
}
