import { LocalizedTitle } from "@/components/LocalizedTitle";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create pre-order",
  description: "Ring pre-order creation",
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <LocalizedTitle messageId="ringOrderCreationPageTitle" />
      {children}
    </>
  );
}
