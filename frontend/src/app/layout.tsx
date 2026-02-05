"use client";
import "./globals.scss";
import "bootstrap-icons/font/bootstrap-icons.css";
import Header from "@/components/Header";
import { ModalsProvider } from "@/components/ModalsProvider";
import { ModalView } from "@/components/ModalView";
import { AuthProvider } from "@/components/AuthProvider";
import { ConfigProvider } from "@/components/ConfigProvider";
import { Alert } from "@/components/Alert";
import { Config } from "./system/contexts";
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
                <div className="d-flex flex-column vh-100">
                  <Header />
                  <div className="flex-grow-1 flex-shrink-1 d-flex overflow-hidden">
                    {children}
                  </div>
                </div>
              </ModalsProvider>
            </AuthProvider>
          </LocaleProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}
