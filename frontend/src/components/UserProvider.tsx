"use client"
import { useEffect, useState, useContext } from "react";
import { User, UserContext } from "../app/system/contexts";
import { useRouter } from 'next/navigation';


export function UserProvider({children, requireAuth}: {children: React.ReactNode, requireAuth?: boolean}) {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const username = sessionStorage.getItem('username');
      if (username) {
        setUser({username, auth: true});
      } else {
        setUser({auth: false})
      }
    }
  }, [setUser]);

  return (
    <UserContext.Provider value={user}>
      {(user || !requireAuth) ? children : <></>}
    </UserContext.Provider>
  );
}

export function ReuqireAuth({children}: {children: React.ReactNode}) {
  const user = useContext(UserContext);
  const router = useRouter();
  useEffect(() => {
    if (user && !user.auth) {
      router.push("/login/");
    }
  }, [user]);

  return (
    user && user.auth ? children : <></>
  );
}