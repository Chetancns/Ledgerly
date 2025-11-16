// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
} from "@nestjs/common";
import { Response, Request } from "express";
import { AuthService } from "./auth.service";
import { LoginDto, RegisterDto } from "./dto/auth.dto";
import { JwtAuthGuard } from "./jwt.guard";
import express from "express";
@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  private setAccessCookie(res: Response, token: string) {
    console.log("[AuthController] setAccessCookie. token starts:", token.slice(0,8), "...");
    res.cookie("accessToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
      maxAge: 1000 * 60 * 15, // 15 minutes
    });
  }

  private setRefreshCookie(res: Response, token: string) {
    console.log("[AuthController] setRefreshCookie. token starts:", token.slice(0,8), "...");
    res.cookie("refreshToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/", // <--- IMPORTANT: path "/" per your choice
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });
  }

  @Get("csrf-token")
  csrf(@Req() req: express.Request) {
    const token = req.cookies["XSRF-TOKEN"];
    console.log("[AuthController] csrf-token requested. cookie:", token ? token.slice(0,8)+"..." : "none");
    return { csrfToken: token };
  }

  @Post("register")
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: express.Response) {
    const { accessToken, refreshToken, user } = await this.auth.register(dto);
    this.setAccessCookie(res, accessToken);
    this.setRefreshCookie(res, refreshToken);
    console.log("[AuthController] register: responding with user id", user.id);
    return { user };
  }

  @Post("login")
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: express.Response) {
    const { accessToken, refreshToken, user } = await this.auth.login(dto);
    this.setAccessCookie(res, accessToken);
    this.setRefreshCookie(res, refreshToken);
    console.log("[AuthController] login: responding with user id", user.id);
    return { user };
  }

  @Post("refresh")
  @HttpCode(200)
  async refresh(@Req() req: express.Request, @Res({ passthrough: true }) res: express.Response) {
    const oldRefresh = req.cookies.refreshToken;
    console.log("[AuthController] refresh called. incoming cookie present:", !!oldRefresh);
    if (!oldRefresh) {
      console.warn("[AuthController] refresh: no refresh cookie");
      throw new Error("No refresh token");
    }

    const { accessToken, refreshToken } = await this.auth.rotateRefreshToken(oldRefresh);

    this.setAccessCookie(res, accessToken);
    this.setRefreshCookie(res, refreshToken);

    console.log("[AuthController] refresh: rotated tokens");
    return { accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@Req() req: express.Request) {
    console.log("[AuthController] me called, user:", (req as any).user);
    return { user: (req as any).user };
  }

  @Post("logout")
  async logout(@Res({ passthrough: true }) res: express.Response) {
    console.log("[AuthController] logout: clearing cookies");
    res.clearCookie("accessToken", { path: "/" });
    res.clearCookie("refreshToken", { path: "/" });
    return { message: "Logged out" };
  }
}
