// src/hooks/useAuth.ts
import { useState, useEffect } from "react";
import { login, signup } from "../services/auth";
import { User } from "../models/User";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const doLogin = async (email: string, password: string) => {
      try {
          //alert("api called ", email, password);
          const res = await login(email, password);
          //console.log("api called end ", res);
      const userData = res.data.user;
        setUser(userData);
        //alert("sahfoie");
        localStorage.setItem("accessToken", res.data.accessToken);
          localStorage.setItem("user", JSON.stringify(userData));
          //console.log(localStorage.getItem("accessToken"));
      return userData;
    } catch (err: unknown) {
      if (err instanceof Error) {
    throw new Error(err?.message || "Signup failed");
  }
  throw new Error("Login failed");
    }
  };

  const doSignup = async (email: string, password: string, name: string) => {
    try {
      //console.log(email,password,name);
      const res = await signup(email, password, name);
      alert("sahfoie");
      const userData = res.data.user;
        setUser(userData);
        localStorage.setItem("accessToken", res.data.accessToken);
      localStorage.setItem("user", JSON.stringify(userData));
      return userData;
    } catch (err: unknown) {
        if (err instanceof Error) {
    throw new Error(err?.message || "Signup failed");
  }
  throw new Error("Login failed");
      
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  return { user, loading, doLogin, doSignup, logout };
};
