import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { isAllowedOrigin } from '../../config/security.config.js';

const CSRF_TOKEN_MAX_AGE_MS = 30 * 60 * 1000;

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const origin = request.get('origin') ?? this.originFromReferer(request.get('referer'));
    const token = request.get('x-csrf-token');

    if (!isAllowedOrigin(origin, this.configService) || !token || !this.isValidToken(token)) {
      throw new ForbiddenException('Permintaan tidak memenuhi validasi keamanan.');
    }
    return true;
  }

  createToken(): string {
    const issuedAt = Date.now().toString();
    const nonce = randomUUID();
    const payload = `${issuedAt}.${nonce}`;
    return `${payload}.${this.sign(payload)}`;
  }

  private isValidToken(token: string): boolean {
    const [issuedAt, nonce, signature, ...extra] = token.split('.');
    if (!issuedAt || !nonce || !signature || extra.length > 0) return false;

    const issuedAtNumber = Number(issuedAt);
    if (!Number.isSafeInteger(issuedAtNumber) || Date.now() - issuedAtNumber > CSRF_TOKEN_MAX_AGE_MS || issuedAtNumber > Date.now() + 60_000) {
      return false;
    }

    const expected = this.sign(`${issuedAt}.${nonce}`);
    const actualBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.configService.getOrThrow<string>('CSRF_SECRET'))
      .update(payload)
      .digest('hex');
  }

  private originFromReferer(referer: string | undefined): string | undefined {
    if (!referer) return undefined;
    try {
      return new URL(referer).origin;
    } catch {
      return undefined;
    }
  }
}
