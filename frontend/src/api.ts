import axios from "axios";

const api = axios.create({ baseURL: "/api", withCredentials: true });

api.interceptors.request.use((config) => {
  // In MAF mode (local dev via Vite), use X-Auth-Email header for auth
  // The backend AUTH_MODE=maf will trust this in development
  if (import.meta.env.DEV) {
    config.headers["X-Auth-Email"] = "mafadminuser.local@nielsen.com";
  }

  // Keep legacy token support for local-only mode (if AUTH_MODE=local)
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // In MAF mode, don't redirect to login — MAF handles re-auth
    if (error.response?.status === 401) {
      console.warn("[api] 401 Unauthorized — MAF session may have expired");
    }
    return Promise.reject(error);
  },
);

export default api;
