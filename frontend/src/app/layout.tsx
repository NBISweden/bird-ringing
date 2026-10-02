import "./globals.scss";
import "bootstrap-icons/font/bootstrap-icons.css";
import { ModalsProvider } from "@/components/ModalsProvider";
import { ModalView } from "@/components/ModalView";
import { AuthProvider } from "@/components/AuthProvider";
import { ConfigProvider } from "@/components/ConfigProvider";
import { Alert } from "@/components/Alert";
import { Config } from "./(system)/contexts";
import { LocaleProvider } from "@/components/LocaleProvider";
import { Metadata } from "next";
import { Suspense } from "react";
import { PageContent } from "@/components/PageContent";
import { LocalizedTitle } from "@/components/LocalizedTitle";

export const metadata: Metadata = {
  title: "Bird Ringing",
  description: "Bird Ringing system from NRM",
};

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
        <Suspense>
          <ConfigProvider
            configUrl="/config.json"
            errorMessage={<ConfigError />}
            defaultConfig={defaultConfig}
          >
            <LocaleProvider locale={locale}>
              <AuthProvider>
                <ModalsProvider>
                  <LocalizedTitle messageId="rootPageTitle" />
                  <ModalView />
                  <PageContent>{children}</PageContent>
                </ModalsProvider>
              </AuthProvider>
            </LocaleProvider>
          </ConfigProvider>
        </Suspense>
      </body>
    </html>
  );
}
