// src/auth/jwt.strategy.ts
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-jwt";
import { ExtractJwtFromCookie } from "./jwt-cookie-extractor";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("[JWT] JWT_SECRET not set in env!");
      throw new Error("JWT_SECRET not set");
    }

    super({
      jwtFromRequest: ExtractJwtFromCookie,
      secretOrKey: secret,
      ignoreExpiration: false,
    });
  }

  async validate(payload: any) {
    // payload contains sub, email, name from generation
    console.log("[JWT] Validated payload:", { sub: payload.sub, email: payload.email });
    return payload;
  }
}
