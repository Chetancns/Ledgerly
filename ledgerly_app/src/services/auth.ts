import api from "./api";
import { LoginResponse } from "@/models/Auth";

export const login = (email: string, password: string) =>
    api.post<LoginResponse>("/auth/login", { email, password });

export const signup = (email: string, password: string, name: string) =>
  api.post<LoginResponse>("/auth/register", { email, password, name });
