import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { RATE_LIMIT_KEY, type RateLimitOptions } from '../decorators/rate-limit.decorator.js';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Process-local limiter. It deliberately uses the socket-derived request IP,
 * not client-controlled forwarding headers. Deployments with multiple backend
 * instances must replace this store with a shared implementation (for example
 * Redis) to obtain a global limit.
 */
@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly entries = new Map<string, RateLimitEntry>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!options) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const identity = request.socket.remoteAddress ?? request.ip ?? 'unknown';
    const key = `${request.method}:${request.route?.path ?? request.path}:${identity}`;
    const now = Date.now();
    const entry = this.entries.get(key);

    if (!entry || entry.resetAt <= now) {
      this.entries.set(key, { count: 1, resetAt: now + options.ttlMs });
      return true;
    }

    if (entry.count >= options.limit) {
      throw new HttpException(
        'Terlalu banyak permintaan. Silakan coba lagi nanti.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    entry.count += 1;
    return true;
  }
}
