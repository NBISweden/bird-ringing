"use client";
import { Suspense } from "react";
import { IntlProvider } from "react-intl";
import { defaultMessages, TranslationMap } from "@/app/messages";
import useSWRImmutable from "swr/immutable";

export function LocaleProvider({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactElement;
}) {
  return (
    <Suspense
      fallback={
        <IntlProvider locale={locale} messages={defaultMessages}>
          {children}
        </IntlProvider>
      }
    >
      <LocaleLoader defaultMessages={defaultMessages} locale={locale}>
        {children}
      </LocaleLoader>
    </Suspense>
  );
}

async function loadLocale([_, locale, root]: [
  string,
  string,
  string,
]): Promise<TranslationMap> {
  const translations = (await fetch(`${root}/locales/${locale}`)).json();
  return translations;
}

function LocaleLoader({
  locale,
  defaultMessages,
  localeRoot,
  children,
}: {
  locale: string;
  localeRoot?: string;
  defaultMessages: Record<string, string>;
  children: React.ReactElement;
}) {
  const { data, error } = useSWRImmutable(
    ["fetchLocale", locale, localeRoot || ""],
    loadLocale,
  );
  if (error) {
    console.warn("Failed to load locale:", locale, error);
  }
  return (
    <IntlProvider locale={locale} messages={data ? data : defaultMessages}>
      {children}
    </IntlProvider>
  );
}
