"use client"
import { AuthContext } from "@/app/system/contexts";
import Link from "next/link";
import { useContext } from "react";

export default function UserInfo() {
  const auth = useContext(AuthContext);
  return auth && auth.isAuthenticated ? (
    <Link href="/system/welcome">
      <div className="btn btn-outline-light user-info">
        {auth.username}
      </div>
    </Link>
  ) : (
    <></>
  )
}