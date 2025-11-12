import Link from "next/link";

export default function Header() {
    return (
        <header className="navbar navbar-expand-lg navbar-dark bg-primary">
            <div className="container-fluid">
                <Link href="/" className="navbar-brand">
                    Bird Ringing
                </Link>
            </div>
        </header>
    )
}