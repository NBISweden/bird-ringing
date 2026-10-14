import { LocalizedTitle } from "@/components/LocalizedTitle";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bird Ringing: Welcome",
  description: "Welcome to the NRM Bird Ringing management system",
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <LocalizedTitle messageId="welcomPageTitle" />
      {children}
    </>
  );
}
