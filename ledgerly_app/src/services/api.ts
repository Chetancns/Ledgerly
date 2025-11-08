import axios from "axios";
import Cookies from "js-cookie";

const api = axios.create({
  baseURL: "http://192.168.1.50:3001", // same IP as backend
  withCredentials: true, // important for cookies
});

api.interceptors.request.use((config) => {
  const csrfToken = Cookies.get("XSRF-TOKEN");
  console.log("CSRF Token added to request:", csrfToken);
  if (
    csrfToken &&
    config.method &&
    [ "post", "put", "patch", "delete"].includes(config.method)
  ) {
    console.log("Adding CSRF token to request headers");
    config.headers["X-CSRF-Token"] = csrfToken;
  }
  return config;
});

export default api;
