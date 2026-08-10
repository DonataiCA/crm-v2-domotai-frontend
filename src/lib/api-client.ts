import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const TOKEN_KEY = 'auth_token';
const ORG_ID_KEY = 'current_organization_id';

// ─── Token helpers ──────────────────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ─── Organization ID helpers ────────────────────────────────────────────────

export function getOrganizationId(): string | null {
  return localStorage.getItem(ORG_ID_KEY);
}

export function setOrganizationId(id: string): void {
  localStorage.setItem(ORG_ID_KEY, id);
}

export function clearOrganizationId(): void {
  localStorage.removeItem(ORG_ID_KEY);
}

// ─── Axios instance ─────────────────────────────────────────────────────────

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization header on every request
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const orgId = getOrganizationId();
  if (orgId) {
    config.headers['X-Organization-Id'] = orgId;
  }
  return config;
});

// Handle response errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      clearToken();
      clearOrganizationId();
      if (!window.location.pathname.startsWith('/auth')) {
        window.location.href = '/auth';
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
