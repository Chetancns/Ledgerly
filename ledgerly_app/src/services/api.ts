// src/services/api.ts
import axios from "axios";
import Cookies from "js-cookie";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://192.168.1.50:3001"; // update as needed

const api = axios.create({
  baseURL: BASE,
  withCredentials: true, // <-- required for cookies to be sent cross-site
});

/* ---------------------------- REQUEST (CSRF injection + debug) ---------------------------- */
api.interceptors.request.use((config) => {
  const csrf = Cookies.get("XSRF-TOKEN");
  console.log("[api] request:", config.method?.toUpperCase(), config.url, "csrf present:", !!csrf);

  if (csrf && config.method && ["post", "put", "patch", "delete"].includes(config.method.toLowerCase())) {
    config.headers = config.headers || {};
    config.headers["X-CSRF-Token"] = csrf;
    console.log("[api] Added X-CSRF-Token header (first 8):", csrf.slice(0,8)+"...");
  }

  return config;
});

/* ---------------------------- RESPONSE (refresh on 401) ---------------------------- */
let isRefreshing = false;
let failedQueue: Array<{resolve: Function; reject: Function}> = [];

const processQueue = (error: any = null) => {
  console.log("[api] processQueue. error:", !!error, "queued:", failedQueue.length);
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve();
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    console.warn("[api] response error:", err?.response?.status, original?.url);

    if (err.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        console.log("[api] refresh already in progress — queueing request:", original.url);
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve: () => resolve(api(original)), reject });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        console.log("[api] calling /auth/refresh to rotate cookies");
        await api.post("/auth/refresh"); // cookies rotated by backend
        console.log("[api] refresh succeeded, retrying original:", original.url);
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
