import axios from 'axios';

/**
 * Shared axios instance.
 * - baseURL from VITE_API_URL
 * - withCredentials so the httpOnly auth cookie is sent
 * - request interceptor attaches the in-memory bearer token (cookie fallback)
 * - response interceptor: on 401 clears auth + redirects to /login
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  timeout: 30000,
});

let authToken = null;
let onUnauthorized = null;

/** Called by AuthContext to keep the token in sync for the interceptor. */
export function setAuthToken(token) {
  authToken = token;
  if (token) localStorage.setItem('ht_token', token);
  else localStorage.removeItem('ht_token');
}

export function getStoredToken() {
  return authToken || localStorage.getItem('ht_token');
}

/** Register a callback invoked on a 401 so AuthContext can reset state. */
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      setAuthToken(null);
      if (onUnauthorized) onUnauthorized();
    }
    // Normalize the error message for toasts.
    const message =
      error?.response?.data?.error?.message ||
      error?.message ||
      'Something went wrong';
    error.normalizedMessage = message;
    error.fields = error?.response?.data?.error?.fields || null;
    return Promise.reject(error);
  }
);

export default api;
