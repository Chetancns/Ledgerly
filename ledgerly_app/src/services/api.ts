// src/services/api.ts
import axios from "axios";
import Cookies from "js-cookie";
import { initCsrf } from "./auth";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://192.168.1.50:3001";

const api = axios.create({
  baseURL: BASE,
  withCredentials: true, // must be true for cookies
});

// REQUEST INTERCEPTOR: refresh CSRF for unsafe methods
api.interceptors.request.use(async (config) => {
  if (!config.method) return config;

  const method = config.method.toLowerCase();
  const unsafeMethods = ["post", "put", "patch", "delete"];

  if (unsafeMethods.includes(method)) {
    // ensure latest CSRF token
    const res = await initCsrf();
    const token = res.data?.csrfToken;
    if (token) {
      Cookies.set("XSRF-TOKEN", token, {
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        secure: process.env.NODE_ENV === "production",
      });
      config.headers = config.headers || {};
      config.headers["X-CSRF-Token"] = token;
      console.debug("[api] attached refreshed CSRF token:", token.slice(0,8) + "...");
    }
  }

  return config;
});

// RESPONSE INTERCEPTOR (same as before)
let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function; originalConfig: any }> = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(api(p.originalConfig));
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    if (err.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, originalConfig: original });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        await api.post("/auth/refresh");
        processQueue(null);
        return api(original);
      } catch (refreshErr) {
        processQueue(refreshErr);
        // If refresh failed, clear client-side auth artifacts and redirect to login.
        try {
          if (typeof window !== "undefined") {
            // remove any stored token/local state used by frontend
            try {
              localStorage.removeItem("accessToken");
            } catch (e) {
              console.debug("[api] failed clearing localStorage accessToken", e);
            }

            // remove CSRF cookie if present
            try {
              Cookies.remove("XSRF-TOKEN");
            } catch (e) {
              /* ignore */
            }

            // avoid redirect loops: only redirect if not already on auth pages
            const pathname = window.location.pathname || "/";
            const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/auth");
            if (!isAuthRoute) {
              const next = encodeURIComponent(window.location.pathname + window.location.search);
              window.location.href = `/login?next=${next}`;
            }
          }
        } catch (e) {
          console.debug("[api] error during refresh-failure cleanup", e);
        }

        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export default api;
