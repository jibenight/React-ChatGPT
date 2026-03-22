import type { User } from '$lib/types';
import * as tauri from '$lib/tauri';

let _userData = $state<Partial<User>>({});

export const userStore = {
  get userData() { return _userData; },

  setUserData(data: Partial<User>) {
    _userData = data;
  },

  async loadUser() {
    try {
      const raw: any = await tauri.getUser();
      _userData = {
        id: raw.id ?? raw.userId,
        userId: raw.userId ?? raw.id,
        username: raw.username,
        email: raw.email,
      };
    } catch {
      _userData = {};
    }
  },
};
