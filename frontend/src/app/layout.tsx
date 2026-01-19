import "./globals.scss";
import "bootstrap-icons/font/bootstrap-icons.css";
import Header from "@/components/Header";
import { ModalsProvider } from "@/components/ModalsProvider";
import { ModalView } from "@/components/ModalView";
import { AuthProvider } from "@/components/AuthProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body>
        <AuthProvider>
          <ModalsProvider>
            <ModalView />
            <div className="d-flex flex-column vh-100">
              <Header/>
              <div className="flex-grow-1 flex-shrink-1 d-flex overflow-hidden">
                {children}
              </div>
            </div>
          </ModalsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
