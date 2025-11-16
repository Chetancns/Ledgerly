// src/services/api.ts
import axios from "axios";
import Cookies from "js-cookie";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://192.168.1.50:3001";

const api = axios.create({
  baseURL: BASE,
  withCredentials: true, // must be true for cookies
});

/* REQUEST: inject CSRF for unsafe methods */
api.interceptors.request.use((config) => {
  const csrf = Cookies.get("XSRF-TOKEN");
  console.debug("[api] request:", config.method?.toUpperCase(), config.url, "csrf present:", !!csrf);

  if (
    csrf &&
    config.method &&
    ["post", "put", "patch", "delete"].includes(config.method.toLowerCase())
  ) {
    config.headers = config.headers || {};
    config.headers["X-CSRF-Token"] = csrf;
    console.debug("[api] set X-CSRF-Token header (short):", csrf.slice(0,8)+"...");
  }

  return config;
});

/* RESPONSE: refresh-flow based on cookies (no Authorization header usage) */
let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function; originalConfig: any }> = [];

const processQueue = (error: any = null) => {
  console.debug("[api] processQueue error:", !!error, "queue:", failedQueue.length);
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
    console.warn("[api] response error:", err?.response?.status, original?.url);

    // if 401 -> try refresh once, queue concurrent requests
    if (err.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        console.debug("[api] already refreshing - queuing request:", original.url);
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, originalConfig: original });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        console.debug("[api] calling /auth/refresh to rotate cookies");
        // backend rotates refresh cookie and reissues access cookie; cookies are used automatically
        await api.post("/auth/refresh");

        console.debug("[api] refresh succeeded - retrying queued requests");
        processQueue(null);
        return api(original);
      } catch (refreshErr) {
        console.error("[api] refresh failed:", refreshErr);
        processQueue(refreshErr);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export default api;
