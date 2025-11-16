// src/middleware/csrf.middleware.ts
import { randomBytes } from "crypto";
import { Request, Response, NextFunction } from "express";

const CSRF_COOKIE = "XSRF-TOKEN";

export function csrfMiddleware(req: Request, res: Response, next: NextFunction) {
  // Ensure CSRF cookie exists
  let token = req.cookies[CSRF_COOKIE];
  if (!token) {
    token = randomBytes(32).toString("hex");

    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 1000,
    });
  }

  // Allow safe requests
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // Validate CSRF header
  const header = req.headers["x-csrf-token"];
  if (!header || header !== token) {
    return res.status(403).json({ message: "Invalid CSRF token" });
  }

  next();
}
