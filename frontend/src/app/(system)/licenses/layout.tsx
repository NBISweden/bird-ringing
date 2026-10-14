import { LocalizedTitle } from "@/components/LocalizedTitle";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Licenses",
  description: "License management",
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <LocalizedTitle messageId="licensesPageTitle" />
      {children}
    </>
  );
}
