// src/hooks/useAuth.ts
import { useState, useEffect } from "react";
import { User } from "../models/User";
import { login, signup, logout as apiLogout, getCurrentUser, initCsrf } from "../services/auth";
import css from "styled-jsx/css";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load current user using HttpOnly cookie
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await getCurrentUser();
        setUser(res.data.user || null);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

 const ensureCsrfToken = async () => {
  try {
    await initCsrf(); // endpoint that just returns OK
    console.log("CSRF token initialized");
  } catch (e) {
    console.error("CSRF init failed", e);
  }
};

const doLogin = async (email: string, password: string) => {
  await ensureCsrfToken(); // make sure cookie is set first
  await new Promise((r) => setTimeout(r, 100)); // slight delay to ensure cookie is set
  const res = await login(email, password);
  console.log("Login response:", res);
  setUser(res.data.user);
  console.log("User logged in:", res.data.user);
  return res.data.user;
};

const doSignup = async (email: string, password: string, name: string) => {
  await ensureCsrfToken();
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
