import { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext({});

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider({ children }) {
  const [userData, setUserData] = useState({});

  useEffect(() => {
    localStorage.removeItem('user'); // Supprime les données stockées dans le localStorage
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
