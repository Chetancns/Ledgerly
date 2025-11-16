// src/auth/jwt-cookie-extractor.ts
import { Request } from "express";

/**
 * Extract JWT from cookie named "accessToken"
 */
export const ExtractJwtFromCookie = (req: Request) => {
  const token = req.cookies?.accessToken || null;
  return token;
};
