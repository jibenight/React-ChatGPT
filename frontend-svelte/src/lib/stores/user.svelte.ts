import type { User } from '$lib/types';
import * as tauri from '$lib/tauri';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

let _userData = $state<Partial<User>>({});

function normalize(raw: Record<string, unknown>): Partial<User> {
  return {
    id: (raw.id ?? raw.userId) as number | undefined,
    userId: (raw.userId ?? raw.id) as number | undefined,
    username: raw.username as string | undefined,
    email: raw.email as string | undefined,
  };
}

export const userStore = {
  get userData() { return _userData; },

  setUserData(data: Partial<User>) {
    _userData = data;
  },

  clearUser() {
    _userData = {};
    try { localStorage.removeItem('user'); } catch { /* ignore */ }
  },

  async loadUser() {
    // 1. Essayer depuis localStorage (web)
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, unknown>;
        if (parsed?.id) {
          _userData = normalize(parsed);
        }
      }
    } catch { /* ignore */ }

    // 2. Valider la session côté serveur
    if (isTauri) {
      try {
        const raw = await tauri.getUser() as Record<string, unknown>;
        _userData = normalize(raw);
      } catch {
        _userData = {};
      }
    } else {
      try {
        const { apiGet } = await import('$lib/api');
        const raw = await apiGet<Record<string, unknown>>('/api/users');
        _userData = normalize(raw);
        localStorage.setItem('user', JSON.stringify(_userData));
      } catch {
        _userData = {};
        try { localStorage.removeItem('user'); } catch { /* ignore */ }
      }
    }
  },
};
