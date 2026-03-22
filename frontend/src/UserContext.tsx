import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from './types';

type UserData = Partial<User>;

type UserContextValue = {
  userData: UserData;
  setUserData: (data: UserData | ((prev: UserData) => UserData)) => void;
};

const UserContext = createContext<UserContextValue>({
  userData: {},
  setUserData: () => {},
});

export function useUser() {
  return useContext(UserContext);
}

const isTauri = '__TAURI_INTERNALS__' in window;

export function UserProvider({ children }: { children: ReactNode }) {
  const [userData, setUserData] = useState<UserData>(() => {
    if (isTauri) return {};
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (!isTauri) return;
    let cancelled = false;
    import('@tauri-apps/api/core')
      .then(({ invoke }) => invoke('get_user'))
      .then((user: any) => {
        if (cancelled) return;
        const normalized = {
          id: user.id,
          userId: user.id,
          username: user.username,
          email: user.email,
        };
        setUserData(normalized);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load user:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Validate web session against server on mount
  useEffect(() => {
    if (isTauri) return;
    const apiUrl = import.meta.env.VITE_API_URL || '';
    fetch(`${apiUrl}/api/users`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) {
          setUserData({});
          localStorage.removeItem('user');
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        const user = Array.isArray(data) ? data[0] : data;
        if (!user?.id) {
          setUserData({});
          localStorage.removeItem('user');
          return;
        }
        const normalized = {
          id: user.id,
          userId: user.id,
          username: user.username,
          email: user.email,
        };
        setUserData(normalized);
        localStorage.setItem('user', JSON.stringify(normalized));
      })
      .catch(() => {
        // Network error — keep localStorage state so we don't log out on flaky connections
      });
  }, []);

  return (
    <UserContext.Provider value={{ userData, setUserData }}>
      {children}
    </UserContext.Provider>
  );
}
