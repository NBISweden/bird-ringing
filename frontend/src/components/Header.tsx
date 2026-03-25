"use client";
import Link from "next/link";
import UserInfo from "./UserInfo";
import { useTranslation } from "@/app/(system)/internationalization";

export default function Header() {
  const { t } = useTranslation();
  return (
    <header className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container-fluid">
        <Link href="/" className="navbar-brand">
          {t("birdRinging")}
        </Link>
        <UserInfo />
      </div>
    </header>
  );
}
