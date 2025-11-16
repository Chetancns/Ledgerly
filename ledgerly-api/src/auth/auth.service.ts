// src/auth/auth.service.ts
import { Injectable, UnauthorizedException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../users/user.entity";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import { RegisterDto, LoginDto } from "./dto/auth.dto";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
  ) {}

  async register(dto: RegisterDto) {
    console.log("[AuthService] register for", dto.email);
    const exists = await this.users.findOne({ where: { email: dto.email } });
    if (exists) {
      console.warn("[AuthService] email already exists:", dto.email);
      throw new ConflictException("Email already exists");
    }

    const user = this.users.create({
      name: dto.name,
      email: dto.email,
      passwordHash: await bcrypt.hash(dto.password, 12),
    });

    await this.users.save(user);

    const access = this.generateAccessToken(user);
    const refresh = this.generateRefreshToken(user);

    user.refreshTokenHash = await bcrypt.hash(refresh, 12);
    await this.users.save(user);

    console.log("[AuthService] registered user id:", user.id);
    return { accessToken: access, refreshToken: refresh, user };
  }

  async login(dto: LoginDto) {
    console.log("[AuthService] login attempt:", dto.email);
    const user = await this.users.findOne({ where: { email: dto.email } });
    if (!user) {
      console.warn("[AuthService] login failed - user not found:", dto.email);
      throw new UnauthorizedException("Invalid credentials");
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      console.warn("[AuthService] login failed - bad password for:", dto.email);
      throw new UnauthorizedException("Invalid credentials");
    }

    const access = this.generateAccessToken(user);
    const refresh = this.generateRefreshToken(user);

    user.refreshTokenHash = await bcrypt.hash(refresh, 12);
    await this.users.save(user);

    console.log("[AuthService] login success:", user.id);
    return { accessToken: access, refreshToken: refresh, user };
  }

  async rotateRefreshToken(oldToken: string) {
    console.log("[AuthService] rotateRefreshToken called");
    let payload: any;
    try {
      payload = jwt.verify(oldToken, process.env.JWT_REFRESH_SECRET!);
    } catch (err) {
      console.warn("[AuthService] rotate failed - invalid/expired refresh token");
      throw new UnauthorizedException("Expired refresh token");
    }

    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user || !user.refreshTokenHash) {
      console.warn("[AuthService] rotate failed - user not found or no stored hash");
      throw new UnauthorizedException("Invalid refresh token");
    }

    const matches = await bcrypt.compare(oldToken, user.refreshTokenHash);
    if (!matches) {
      console.warn("[AuthService] rotate failed - refresh token mismatch");
      throw new UnauthorizedException("Invalid refresh token");
    }

    const newAccess = this.generateAccessToken(user);
    const newRefresh = this.generateRefreshToken(user);

    user.refreshTokenHash = await bcrypt.hash(newRefresh, 12);
    await this.users.save(user);

    console.log("[AuthService] rotated tokens for user:", user.id);
    return { accessToken: newAccess, refreshToken: newRefresh };
  }

  generateAccessToken(user: User) {
    return jwt.sign(
      { sub: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET!,
      { expiresIn: "15m" }
    );
  }

  generateRefreshToken(user: User) {
    return jwt.sign(
      { sub: user.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: "7d" }
    );
  }
}
