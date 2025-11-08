import { randomBytes } from "crypto";
import { Request, Response, NextFunction } from "express";

// Use a constant cookie name so frontend can read it (via js-cookie)
const CSRF_COOKIE_NAME = "XSRF-TOKEN";

export function csrfMiddleware(req: Request, res: Response, next: NextFunction) {
  // 🔹 Skip CSRF entirely for development convenience
  if (process.env.NODE_ENV === "development") {
    return next();
  }

  // 🔹 Ignore safe/read-only methods (these don’t require CSRF tokens)
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const existingToken = req.cookies[CSRF_COOKIE_NAME];
    if (!existingToken) {
      const newToken = randomBytes(32).toString("hex");
      console.log("sameSite CSRF token set:", process.env.NODE_ENV === "production" ? "none" : "lax", );  
      res.cookie(CSRF_COOKIE_NAME, newToken, {
        httpOnly: false,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", 
        secure: process.env.NODE_ENV === "production",     
        path: "/",
      });
    }
    return next();
  }

  const csrfHeader = req.headers["x-csrf-token"];
  const csrfCookie = req.cookies[CSRF_COOKIE_NAME];
  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
    return res.status(403).json({ message: "Invalid CSRF token" });
  }

  return next();
}


