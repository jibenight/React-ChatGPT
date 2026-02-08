import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import apiClient from './apiClient';

type UserData = Record<string, any>;

type UserContextValue = {
  userData: UserData;
  setUserData: (data: UserData) => void;
};

const UserContext = createContext<UserContextValue>({
  userData: {},
  setUserData: () => {},
});

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [userData, setUserData] = useState<UserData>({});

  useEffect(() => {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        setUserData(user);
      } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
  }, []);

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
