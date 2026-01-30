"use client";

import "./page.scss";
import { useContext } from "react";
import { AuthContext } from "./system/contexts";
import Link from "next/link";
import { AuthProvider } from "@/components/AuthProvider";

export default function Home() {
  return (
    <AuthProvider>
      <HomeCore />
    </AuthProvider>
  );
}

function HomeCore() {
  const auth = useContext(AuthContext);

  return (
    <main className="container text-center mt-5">
      <div>
        <h1>Welcome to Birdy!</h1>
        <p>The most fantastic place to manage your licenses.</p>
      </div>
      <div className="mt-4">
        {auth && auth.isAuthenticated ? (
          <Link className="btn btn-primary" href="/system/welcome">
            <i className="bi bi-twitter"></i> Go to system
          </Link>
        ) : (
          <Link className="btn btn-primary" href="/login">
            <i className="bi bi-twitter"></i> Experts Login
          </Link>
        )}
      </div>
    </main>
  );
}
