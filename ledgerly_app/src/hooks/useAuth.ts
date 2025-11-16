// src/hooks/useAuth.ts
import { useState, useEffect } from "react";
import { User } from "@/models/User";
import { login, signup, logout as apiLogout, getCurrentUser, initCsrf } from "@/services/auth";
import Cookies from "js-cookie";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        console.log("[useAuth] fetching current user (me)");
        // calling /auth/me triggers CSRF middleware which issues/rotates CSRF cookie on GET
        const res = await getCurrentUser();
        console.log("[useAuth] /auth/me response:", res.status, res.data);
        setUser(res.data.user || null);
      } catch (err) {
        console.warn("[useAuth] getCurrentUser failed:",  err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const ensureCsrf = async () => {
    try {
      console.log("[useAuth] ensureCsrf -> calling /auth/csrf-token");
      const res = await initCsrf();
      const token = res.data?.csrfToken;
      if (token) {
        Cookies.set("XSRF-TOKEN", token, { sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", secure: process.env.NODE_ENV === "production" });
        console.log("[useAuth] got CSRF token (first 8):", token.slice(0,8)+"...");
      }
    } catch (e) {
      console.warn("[useAuth] ensureCsrf failed:", e);
    }
  };

  const doLogin = async (email: string, password: string) => {
    await ensureCsrf();
    console.log("[useAuth] performing login for", email);
    const res = await login(email, password);
    console.log("[useAuth] login response:", res.status);
    setUser(res.data.user);
    return res.data.user;
  };

  const doSignup = async (email: string, password: string, name: string) => {
    await ensureCsrf();
    const res = await signup(email, password, name);
    setUser(res.data.user);
    return res.data.user;
  };

  const logoutapi = async () => {
    await apiLogout();
    setUser(null);
  };

  return { user, loading, doLogin, doSignup, logoutapi };
};
