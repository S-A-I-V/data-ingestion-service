import axios from "axios";

/**
 * API client configured for MAF gateway routing (webpack/deployed) or
 * direct backend access (Vite standalone dev).
 */
const IS_VITE_DEV = typeof import.meta !== "undefined" && import.meta.env?.DEV === true;
const BASE_URL = IS_VITE_DEV ? "/api" : "/api/v3/nfc-admin/api";

const api = axios.create({ baseURL: BASE_URL, withCredentials: true });

api.interceptors.request.use((config) => {
  if (IS_VITE_DEV) {
    config.headers["X-Auth-Email"] = "saideep.verma01@gmail.com";
  }

  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("[api] 401 Unauthorized — MAF session may have expired");
    }
    return Promise.reject(error);
  },
);

export default api;
