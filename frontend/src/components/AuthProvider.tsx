"use client"
import { useEffect, useContext } from "react";
import { Auth, AuthContext } from "../app/system/contexts";
import { useRouter } from 'next/navigation';
import useSWR from "swr";

async function fetchUser([url]: [string]): Promise<Auth> {
  const response = await fetch(url, {
    method: "GET",
    credentials: "same-origin"
  });
  const auth = await response.json()
  return {
    username: auth.username || "",
    permissions: auth.permissions || [],
    isAuthenticated: auth.isAuthenticated || false,
  };
}

export function AuthProvider({children}: {children: React.ReactNode}) {
  const {data: tryAuth, isLoading} = useSWR(
    ["http://localhost:3210/api/login/"],
    fetchUser,
    {
      revalidateOnMount: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 0,
    }
  );
  const auth = isLoading ? null : tryAuth || null;

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function RequireAuth({children}: {children: React.ReactNode}) {
  const user = useContext(AuthContext);
  const router = useRouter();
  useEffect(() => {
    if (user && !user.isAuthenticated) {
      router.push("/login/");
    }
  }, [user]);

  return (
    user && user.isAuthenticated ? children : <></>
  );
}