'use client';

import './page.scss';
import { useContext } from "react";
import { UserContext } from "./system/contexts"
import Link from "next/link";

export default function Home() {
  const userContext = useContext(UserContext);

  return (
    <main className="container text-center mt-5">
      <div>
        <h1>Welcome to Birdy!</h1>
        <p>The most fantastic place to manage your licenses.</p>
      </div>
      <div className="mt-4">
        {userContext && userContext.auth ? (
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
