"use client";
import { useEffect, useContext, useMemo } from "react";
import { Auth, AuthContext, useConfig } from "../app/system/contexts";
import { usePathname, useRouter } from "next/navigation";
import useSWR from "swr";
import { getCookie, parseCompleteUrl } from "../app/system/utils";

async function fetchUser([url]: [string]): Promise<Auth> {
  const response = await fetch(url, {
    method: "GET",
    credentials: "same-origin",
  });
  const auth = await response.json();
  return {
    username: auth.username || "",
    permissions: auth.permissions || [],
    isAuthenticated: auth.isAuthenticated || false,
  };
}

async function authenticate(
  url: string,
  username: string,
  password: string,
): Promise<Auth> {
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
        Accept: "application/json",
        "X-CSRFToken": csrftoken || "",
      },
      body: JSON.stringify({
        username,
        password,
      }),
      credentials: "same-origin",
    });

    if (res.ok) {
      result = await res.json();
    } else {
      const errorInfo = await res.json();
      error = errorInfo?.detail || "Invalid credentials";
    }
  } catch (_err) {
    error = "Network or server error.";
  }
  if (error) {
    throw new Error(error);
  }
  return result;
}

async function signOut(authUrl: string) {
  const csrftoken = getCookie("csrftoken");
  await fetch(authUrl, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-CSRFToken": csrftoken || "",
    },
    credentials: "same-origin",
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { authUrl: baseUrl } = useConfig();
  const authUrl = parseCompleteUrl(baseUrl);
  const { data: tryAuth, isLoading } = useSWR([authUrl], fetchUser, {
    revalidateOnMount: true,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 0,
  });
  const auth = isLoading ? null : tryAuth || null;
  const authWithAuthenticate = useMemo(() => {
    if (auth !== null) {
      return {
        ...auth,
        signIn: (username: string, password: string) =>
          authenticate(authUrl, username, password),
        signOut: () => signOut(authUrl),
      };
    }
    return auth;
  }, [authUrl, auth]);

  return (
    <AuthContext.Provider value={authWithAuthenticate}>
      {children}
    </AuthContext.Provider>
  );
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useContext(AuthContext);
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (user && !user.isAuthenticated) {
      router.push(`/login/?target=${pathname}`);
    }
  }, [user, pathname, router]);

  return user && user.isAuthenticated ? children : <></>;
}
