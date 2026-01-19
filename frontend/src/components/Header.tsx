import Link from "next/link";
import UserInfo from "./UserInfo";

export default function Header() {
  return (
    <header className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container-fluid">
        <Link href="/" className="navbar-brand">
          Bird Ringing
        </Link>
        <UserInfo />
      </div>
    </header>
  )
}