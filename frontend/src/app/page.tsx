"use client";

import "./page.scss";
import { useContext } from "react";
import { AuthContext } from "./(system)/contexts";
import Link from "next/link";
import { AuthProvider } from "@/components/AuthProvider";
import { useTranslation } from "./(system)/internationalization";

export default function Home() {
  return (
    <AuthProvider>
      <HomeCore />
    </AuthProvider>
  );
}

function HomeCore() {
  const auth = useContext(AuthContext);
  const { t } = useTranslation();

  return (
    <main className="container text-center mt-5">
      <div>
        <h1>{t("welcomeMessageHeader")}</h1>
        <p>{t("welcomeMessageText")}</p>
      </div>
      <div className="mt-4">
        {auth && auth.isAuthenticated ? (
          <Link className="btn btn-primary" href="/welcome">
            <i className="bi bi-twitter"></i> {t("goToSystem")}
          </Link>
        ) : (
          <Link className="btn btn-primary" href="/login">
            <i className="bi bi-twitter"></i> {t("expertsLogin")}
          </Link>
        )}
      </div>
    </main>
  );
}
