"use client";
import "./globals.scss";
import "bootstrap-icons/font/bootstrap-icons.css";
import Header from "@/components/Header";
import { ModalsProvider } from "@/components/ModalsProvider";
import { ModalView } from "@/components/ModalView";
import { AuthProvider } from "@/components/AuthProvider";
import { ConfigProvider } from "@/components/ConfigProvider";
import { Alert } from "@/components/Alert";
import { Config, useModalsContext } from "./(system)/contexts";
import { LocaleProvider } from "@/components/LocaleProvider";

function ConfigError() {
  return (
    <div className="container">
      <h1>Failed to load site</h1>
      <Alert>
        The site seems to be misconfigured. See console for error details.
      </Alert>
    </div>
  );
}

function PageContent({ children }: { children: React.ReactNode }) {
  const { stack } = useModalsContext();
  const modalOpen = stack.length > 0;
  return (
    <div className="d-flex flex-column vh-100" inert={modalOpen}>
      <Header />
      <div className="flex-grow-1 flex-shrink-1 d-flex overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const defaultConfig: Config = {
    authUrl: "api/login/",
    apiRootUrl: "api/",
    defaultLang: "en",
  };
  const locale = defaultConfig.defaultLang;
  return (
    <html lang={locale}>
      <body>
        <ConfigProvider
          configUrl="/config.json"
          errorMessage={<ConfigError />}
          defaultConfig={defaultConfig}
        >
          <LocaleProvider locale={locale}>
            <AuthProvider>
              <ModalsProvider>
                <ModalView />
                <PageContent>{children}</PageContent>
              </ModalsProvider>
            </AuthProvider>
          </LocaleProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}
