import "./globals.scss";
import "bootstrap-icons/font/bootstrap-icons.css";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html lang="sv">
      <body>
      <div className="d-flex flex-column min-vh-100">
          <Header/>
          <div className="flex-grow-1 d-flex">
              <Sidebar/>
              <main className="flex-grow-1 p-3">
                  {children}
              </main>
          </div>
          <Footer/>
      </div>
      </body>
      </html>
  );
}
