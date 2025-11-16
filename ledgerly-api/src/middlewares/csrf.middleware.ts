// src/middleware/csrf.middleware.ts
import { randomBytes } from "crypto";
import { Request, Response, NextFunction } from "express";

const CSRF_COOKIE = "XSRF-TOKEN";

/**
 * Simple CSRF middleware:
 * - ensures XSRF-TOKEN cookie exists (readable by JS)
 * - validates X-CSRF-Token header for unsafe methods
 * - refreshes token on GET to avoid long-idle expiry problems
 */
export function csrfMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    let token = req.cookies?.[CSRF_COOKIE];

    if (!token) {
      token = randomBytes(32).toString("hex");
      console.log("[CSRF] No token found. Setting new CSRF cookie:", token.slice(0, 8), "...");

      res.cookie(CSRF_COOKIE, token, {
        httpOnly: false, // frontend JS must read it
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
        // do NOT set a very short maxAge — production rotates it on GET
        maxAge: 24 * 60 * 60 * 1000, // 24h
      });
    }

    // On GET, proactively refresh so long-idle tabs receive a fresh token
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      // rotate token so returning after long idle gets a fresh one
      const newToken = randomBytes(32).toString("hex");
      console.log("[CSRF] GET request — rotating CSRF token:", newToken.slice(0, 8), "...");
      res.cookie(CSRF_COOKIE, newToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
        maxAge: 24 * 60 * 60 * 1000,
      });

      // also update request cookie for possible later validation in this request
      req.cookies[CSRF_COOKIE] = newToken;
      return next();
    }

    // Validate unsafe methods
    const header = (req.headers["x-csrf-token"] || req.headers["X-CSRF-Token"]) as string | undefined;
    const currentToken = req.cookies[CSRF_COOKIE];

    console.log("[CSRF] Validating token for", req.method, "header:", header ? header.slice(0,8)+"..." : "none", "cookie:", currentToken ? currentToken.slice(0,8)+"..." : "none");

    if (!header || !currentToken || header !== currentToken) {
      console.warn("[CSRF] Invalid or missing CSRF token. header != cookie");
      return res.status(403).json({ message: "Invalid CSRF token" });
    }

    return next();
  } catch (err) {
    console.error("[CSRF] Unexpected error:", err);
    return res.status(500).json({ message: "CSRF middleware error" });
  }
}
