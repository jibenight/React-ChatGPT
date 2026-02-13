import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import apiClient from './apiClient';
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

export function UserProvider({ children }: { children: ReactNode }) {
  const [userData, setUserData] = useState<UserData>(() => {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
        return JSON.parse(userJson);
      } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    return {};
  });

  useEffect(() => {
    const userJson = localStorage.getItem('user');
    if (!userJson) return;
    let cancelled = false;
    apiClient
      .get('/api/users')
      .then(response => {
        if (cancelled) return;
        const current = response.data?.[0];
        if (!current) return;
        const normalized = {
          id: current.id,
          userId: current.id,
          username: current.username,
          email: current.email,
        };
        localStorage.setItem('user', JSON.stringify(normalized));
        setUserData(normalized);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error('Session expirée, veuillez vous reconnecter');
        localStorage.removeItem('user');
        setUserData({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <UserContext.Provider value={{ userData, setUserData }}>
      {children}
    </UserContext.Provider>
  );
}
