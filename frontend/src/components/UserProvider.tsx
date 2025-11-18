"use client"
import { useEffect, useState } from "react";
import { User, UserContext } from "../app/system/contexts";
import { useRouter } from 'next/navigation';


export default function ClientProvider({children, requireAuth}: {children: React.ReactNode, requireAuth?: boolean}) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const username = sessionStorage.getItem('username');
      if (username) {
        setUser({username});
      } else if (requireAuth) {
        router.push("/login/");
      }
    }
  }, []);

  return (
    <UserContext.Provider value={user}>
      {(user || !requireAuth) ? children : <></>}
    </UserContext.Provider>
  )
}