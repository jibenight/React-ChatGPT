import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

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
      const user = JSON.parse(userJson);
      setUserData(user);
    }
  }, []);

  return (
    <UserContext.Provider value={{ userData, setUserData }}>
      {children}
    </UserContext.Provider>
  );
}
