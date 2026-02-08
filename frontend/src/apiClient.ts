import axios from 'axios';
import { API_BASE } from './apiConfig';

const DEV_BYPASS_AUTH =
  import.meta.env.DEV &&
  String(import.meta.env.VITE_DEV_BYPASS_AUTH).toLowerCase() === 'true';

const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

apiClient.interceptors.request.use(config => {
  const headers = (config.headers ?? {}) as Record<string, string>;

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

export default apiClient;
