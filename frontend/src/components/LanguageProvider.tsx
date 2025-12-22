"use client"
import { LanguageContext, useLanguage } from "@/app/language";

export function LanguageProvider({children, lang}: {lang: string, children: React.ReactNode}) {
  const language = useLanguage(lang);
  return (
    <LanguageContext.Provider value={language}>{children}</LanguageContext.Provider>
  )
}