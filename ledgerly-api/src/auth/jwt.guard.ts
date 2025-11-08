// jwt.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService, private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = req.cookies['accessToken']; // 🔥 Read from cookie

    if (!token) throw new UnauthorizedException('No access token');

    try {
      const payload = await this.jwtService.verifyAsync(token);
      req.user = payload; // 🔐 Attach user to request
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}