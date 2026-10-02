import { LocalizedTitle } from "@/components/LocalizedTitle";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create actor",
  description: "Actor creation",
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <LocalizedTitle messageId="actorCreationPageTitle" />
      {children}
    </>
  );
}
