// src/hooks/useAuth.ts
import { useState, useEffect } from "react";
import { User } from "@/models/User";
import { login, signup, logout as apiLogout, getCurrentUser } from "@/services/auth";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load current user on mount
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

  const doLogin = async (email: string, password: string) => {
    const res = await login(email, password);
    setUser(res.data.user);
    return res.data.user;
  };

  const doSignup = async (email: string, password: string, name: string) => {
    const res = await signup(email, password, name);
    setUser(res.data.user);
    return res.data.user;
  };

  const logoutapi = async () => {
    await apiLogout();
    setUser(null);
  };

  return {
    user,
    loading,
    doLogin,
    doSignup,
    logoutapi,
  };
};
