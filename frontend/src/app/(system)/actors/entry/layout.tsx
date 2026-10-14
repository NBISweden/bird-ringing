import { LocalizedTitle } from "@/components/LocalizedTitle";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Actor",
  description: "Actor view",
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <LocalizedTitle messageId="actorPageTitle" values={{ name: "" }} />
      {children}
    </>
  );
}
