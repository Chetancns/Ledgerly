// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Response, Request } from "express";
import { AuthService } from "./auth.service";
import { LoginDto, RegisterDto } from "./dto/auth.dto";
import { JwtAuthGuard } from "./jwt.guard";
import express from 'express';
@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  private setAccessCookie(res: Response, token: string) {
    res.cookie("accessToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
      maxAge: 1000 * 60 * 15,
    });
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie("refreshToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/auth/refresh",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
  }

  /* -------------------------- REGISTER -------------------------- */
  @Post("register")
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: express.Response) {
    const { accessToken, refreshToken, user } = await this.auth.register(dto);

    this.setAccessCookie(res, accessToken);
    this.setRefreshCookie(res, refreshToken);

    return { user };
  }

  /* ----------------------------- LOGIN ------------------------------ */
  @Post("login")
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: express.Response) {
    const { accessToken, refreshToken, user } = await this.auth.login(dto);

    this.setAccessCookie(res, accessToken);
    this.setRefreshCookie(res, refreshToken);

    return { user };
  }

  /* ------------------------ REFRESH TOKEN ------------------------ */
  @Post("refresh")
  async refresh(@Req() req: express.Request, @Res({ passthrough: true }) res: express.Response) {
    const oldRefresh = req.cookies.refreshToken;
    if (!oldRefresh) throw new Error("No refresh token");

    const { accessToken, refreshToken } =
      await this.auth.rotateRefreshToken(oldRefresh);

    this.setAccessCookie(res, accessToken);
    this.setRefreshCookie(res, refreshToken);

    return { accessToken };
  }

  /* ---------------------------- CURRENT USER ---------------------------- */
  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@Req() req: express.Request) {
    return { user: req.user };
  }

  /* ---------------------------- LOGOUT ---------------------------- */
  @Post("logout")
  async logout(@Res({ passthrough: true }) res: express.Response) {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    return { message: "Logged out" };
  }
}
