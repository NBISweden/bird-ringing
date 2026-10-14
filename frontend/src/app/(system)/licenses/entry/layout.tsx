import { LocalizedTitle } from "@/components/LocalizedTitle";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "License",
  description: "License view",
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <LocalizedTitle
        messageId="licensePageTitle"
        values={{ license_number: "----", actor: "" }}
      />
      {children}
    </>
  );
}
