"use client"
import { useEffect, useContext, useMemo } from "react";
import { Auth, AuthContext } from "../app/system/contexts";
import { usePathname, useRouter } from 'next/navigation';
import useSWR from "swr";
import { getCookie } from "../app/system/utils";

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

async function authenticate(url: string, username: string, password: string): Promise<Auth> {
  const csrftoken = getCookie("csrftoken");
  let result: Auth = {
    username: "",
    permissions: [],
    isAuthenticated: false,
  };
  let error: string | null = null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-CSRFToken": csrftoken || "",
      },
      body: JSON.stringify({
        username,
        password
      }),
      credentials: "same-origin"
    });

    if (res.ok) {
      result = await res.json();
    } else {
      const errorInfo = await res.json();
      error = errorInfo?.detail || "Invalid credentials";
    }
  } catch (err) {
    error = "Network or server error.";
  }
  if (error) {
    throw new Error(error)
  }
  return result;
}

export function AuthProvider({children}: {children: React.ReactNode}) {
  const apiUrl = "http://localhost:3210/api/login/";
  const {data: tryAuth, isLoading} = useSWR(
    [apiUrl],
    fetchUser,
    {
      revalidateOnMount: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 0,
    }
  );
  const auth = isLoading ? null : tryAuth || null;
  const authWithAuthenticate = useMemo(() => {
    if (auth !== null) {
      return {
        ...auth,
        signIn: (username: string, password: string) => authenticate(apiUrl, username, password) 
      }
    }
    return auth;
  }, [apiUrl, auth])

  return (
    <AuthContext.Provider value={authWithAuthenticate}>
      {children}
    </AuthContext.Provider>
  );
}

export function RequireAuth({children}: {children: React.ReactNode}) {
  const user = useContext(AuthContext);
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (user && !user.isAuthenticated) {
      router.push(`/login/?target=${pathname}`);
    }
  }, [user]);

  return (
    user && user.isAuthenticated ? children : <></>
  );
}