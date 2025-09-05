import axios from "axios";

const api = axios.create({
  baseURL: "http://192.168.1.50:3001", // NestJS backend
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