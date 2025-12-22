import "./globals.scss";
import "bootstrap-icons/font/bootstrap-icons.css";
import Header from "@/components/Header";
import { UserProvider } from "../components/UserProvider";
import { ModalsProvider } from "@/components/ModalsProvider";
import { ModalView } from "@/components/ModalView";
import { LanguageProvider } from "@/components/LanguageProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = "sv"
  return (
    <html lang={lang}>
      <body>
        <LanguageProvider lang={lang}>
          <ModalsProvider>
            <ModalView />
            <UserProvider>
              <div className="d-flex flex-column vh-100">
                <Header/>
                <div className="flex-grow-1 flex-shrink-1 d-flex overflow-hidden">
                  {children}
                </div>
              </div>
            </UserProvider>
          </ModalsProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
