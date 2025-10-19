import axios from "axios";
//console.log("API Base URL:", process.env.NEXT_PUBLIC_API_BASE_URL);
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://192.168.1.50:3001", // use env fallback to previous IP
  withCredentials: true,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("accessToken");
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
} )

export default api;