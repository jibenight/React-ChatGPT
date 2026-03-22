import { userStore } from './user.svelte';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
const devBypass =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEV_BYPASS_AUTH === 'true';

let _isAuthenticated = $state(false);
let _isLoading = $state(true);

export const authStore = {
  get isAuthenticated() { return _isAuthenticated; },
  get isLoading() { return _isLoading; },
  get isTauri() { return isTauri; },

  async init() {
    if (isTauri || devBypass) {
      _isAuthenticated = true;
      _isLoading = false;
      return;
    }
    try {
      await userStore.loadUser();
      _isAuthenticated = !!userStore.userData?.id;
    } catch {
      _isAuthenticated = false;
      userStore.clearUser();
    } finally {
      _isLoading = false;
    }
  },

  onLogin(userData: any) {
    const safe = { id: userData.id || userData.userId, username: userData.username, email: userData.email };
    userStore.setUserData(safe);
    localStorage.setItem('user', JSON.stringify(safe));
    _isAuthenticated = true;
  },

  onLogout() {
    userStore.clearUser();
    localStorage.removeItem('user');
    _isAuthenticated = false;
  },
};
