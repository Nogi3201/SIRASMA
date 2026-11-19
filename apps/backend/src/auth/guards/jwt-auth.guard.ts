import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      throw new UnauthorizedException('Access token tidak ditemukan atau telah kedaluwarsa.');
    }

    try {
      const secret = this.configService.get<string>('JWT_ACCESS_SECRET', 'sirasma_dev_access_secret_key_change_in_prod_123');
      const payload = await this.jwtService.verifyAsync(token, { secret });
      // Attach user payload to request
      (request as any).user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token autentikasi tidak valid atau sudah kedaluwarsa.');
    }
  }

  private extractTokenFromRequest(request: Request): string | undefined {
    // 1. Authorization: Bearer <token>
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type === 'Bearer' && token) {
      return token;
    }

    // 2. Cookie: access_token
    if (request.cookies && request.cookies.access_token) {
      return request.cookies.access_token;
    }

    return undefined;
  }
}
