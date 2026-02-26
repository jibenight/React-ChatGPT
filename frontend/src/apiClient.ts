import axios from 'axios';
import { API_BASE } from './apiConfig';

const DEV_BYPASS_AUTH =
  import.meta.env.DEV &&
  String(import.meta.env.VITE_DEV_BYPASS_AUTH).toLowerCase() === 'true';

const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

const getCsrfToken = (): string | null => {
  for (const cookie of document.cookie.split(';')) {
    const [name, value] = cookie.trim().split('=');
    if (name === '__csrf') return decodeURIComponent(value);
  }
  return null;
};

apiClient.interceptors.request.use(config => {
  const headers = (config.headers ?? {}) as Record<string, string>;
  headers['X-Request-Id'] = crypto.randomUUID();

  const csrfToken = getCsrfToken();
  if (csrfToken && config.method && !['get', 'head', 'options'].includes(config.method.toLowerCase())) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  if (DEV_BYPASS_AUTH) {
    const stored = localStorage.getItem('dev_user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        headers['X-Dev-User-Id'] = user.id;
        headers['X-Dev-User-Name'] = user.username;
        headers['X-Dev-User-Email'] = user.email;
      } catch {
        // ignore invalid storage
      }
    }
  }

  config.headers = headers as any;
  return config;
});

apiClient.interceptors.response.use(
  response => response,
  error => {
    const reqId = error.response?.headers?.['x-request-id'];
    if (reqId) {
      console.error(`[Request ID: ${reqId}] API error:`, error.message);
    }
    if (error.response?.status === 401 && !DEV_BYPASS_AUTH) {
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default apiClient;
