"use client";
import Sidebar, { NavItem } from "@/components/Sidebar";
import { RequireAuth } from "../../components/AuthProvider";
import { ClientProvider } from "@/components/ClientProvider";
import { useTranslation } from "./internationalization";
import { useFlags } from "./contexts";

export default function SystemLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { t } = useTranslation();
  const flags = useFlags();
  const navItems: NavItem[] = [
    {
      type: "item",
      label: t("dashboard"),
      href: "/welcome",
      id: "dashboard",
      icon: "bi-speedometer",
    },
    {
      type: "item",
      label: t("licenseListView"),
      href: "/licenses",
      id: "licenses",
      icon: "bi-journal-check",
      permissions: ["view_licensesequence"],
    },
    {
      type: "item",
      label: t("actorListView"),
      href: "/actors",
      id: "ringare",
      icon: "bi-person-lines-fill",
      permissions: ["view_actor"],
    },
  ];

  if (flags.has("mock-permission-editing")) {
    navItems.push({
      type: "item",
      label: "Permissions",
      href: "/permissions",
      id: "permissions",
      icon: "bi-award",
      permissions: ["view_licensepermissiontype"],
    });
  }

  return (
    <RequireAuth>
      <Sidebar items={navItems} />
      <ClientProvider>
        <main className="flex-grow-1 p-3 h-100 overflow-auto">{children}</main>
      </ClientProvider>
    </RequireAuth>
  );
}
