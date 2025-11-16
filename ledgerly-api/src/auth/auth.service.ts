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

  /* ------------------------- REGISTER ------------------------- */
  async register(dto: RegisterDto) {
    const exists = await this.users.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException("Email already exists");

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

    return { accessToken: access, refreshToken: refresh, user };
  }

  /* -------------------------- LOGIN --------------------------- */
  async login(dto: LoginDto) {
    const user = await this.users.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException("Invalid credentials");

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials");

    const access = this.generateAccessToken(user);
    const refresh = this.generateRefreshToken(user);

    user.refreshTokenHash = await bcrypt.hash(refresh, 12);
    await this.users.save(user);

    return { accessToken: access, refreshToken: refresh, user };
  }

  /* -------------------- REFRESH TOKEN ROTATION -------------------- */
  async rotateRefreshToken(oldToken: string) {
    let payload: any;
    try {
      payload = jwt.verify(oldToken, process.env.JWT_REFRESH_SECRET!);
    } catch {
      throw new UnauthorizedException("Expired refresh token");
    }

    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user || !user.refreshTokenHash)
      throw new UnauthorizedException("Invalid refresh token");

    const matches = await bcrypt.compare(oldToken, user.refreshTokenHash);
    if (!matches) throw new UnauthorizedException("Invalid refresh token");

    // Issue new tokens
    const newAccess = this.generateAccessToken(user);
    const newRefresh = this.generateRefreshToken(user);

    user.refreshTokenHash = await bcrypt.hash(newRefresh, 12);
    await this.users.save(user);

    return { accessToken: newAccess, refreshToken: newRefresh };
  }

  /* --------------------------- HELPERS -------------------------- */
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
