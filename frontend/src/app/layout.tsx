import "./globals.scss";
import "bootstrap-icons/font/bootstrap-icons.css";
import Header from "@/components/Header";
import { UserProvider } from "../components/UserProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body>
        <UserProvider>
          <div className="d-flex flex-column vh-100">
            <Header/>
            <div className="flex-grow-1 flex-shrink-1 d-flex overflow-hidden">
              {children}
            </div>
          </div>
        </UserProvider>
      </body>
    </html>
  );
}
