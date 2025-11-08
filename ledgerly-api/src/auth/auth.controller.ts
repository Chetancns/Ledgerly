import { Controller, Post, Body, Res, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import express from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("csrf-token")
  getCsrfToken(@Req() req: express.Request, @Res() res: express.Response) {
    const token = req.cookies["XSRF-TOKEN"];
    return res.json({ csrfToken: token });
  }

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: express.Response) {
    const { accessToken, user } = await this.authService.register(dto);
    this.setAuthCookie(res, accessToken);
    return { user };
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: express.Response) {
    const { accessToken, user } = await this.authService.login(dto);
    this.setAuthCookie(res, accessToken);
    return { user };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: express.Response) {
    res.clearCookie('accessToken');
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  async getMe(@Req() req: express.Request) {
    const token = req.cookies['accessToken'];
    if (!token) return { user: null };

    const payload = this.authService.verifyToken(token);
    return { user: { id: payload['sub'], email: payload['email'], name: payload['name'] } };
  }

  private setAuthCookie(res: express.Response, token: string) {
    res.cookie('accessToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // only send over HTTPS in production
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict", // CSRF protection
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });
  }
}
