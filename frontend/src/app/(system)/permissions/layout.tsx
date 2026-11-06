import { LocalizedTitle } from "@/components/LocalizedTitle";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Permissions",
  description: "Permission and property management",
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <LocalizedTitle messageId="permissionsPageTitle" />
      {children}
    </>
  );
}
