// src/auth/jwt-cookie-extractor.ts
import { Request } from "express";

export const ExtractJwtFromCookie = (req: Request) => {
  return req.cookies?.accessToken || null;
};
