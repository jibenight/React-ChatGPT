import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
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
  const [userData, setUserData] = useState<UserData>({});

  useEffect(() => {
    let cancelled = false;
    invoke('get_user')
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

  return (
    <UserContext.Provider value={{ userData, setUserData }}>
      {children}
    </UserContext.Provider>
  );
}
