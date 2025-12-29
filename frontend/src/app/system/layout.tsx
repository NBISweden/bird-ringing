import Sidebar, { NavItem } from "@/components/Sidebar";
import { RequireAuth } from "../../components/AuthProvider";
import { ClientProvider } from "@/components/ClientProvider";

export default function SystemLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const navItems: NavItem[] = [
    {
      type: "item",
      label: "Dashboard",
      href: "/system/welcome",
      id: "dashboard",
      icon: "bi-speedometer"
    },
    {
      type: "item",
      label: "Licenses",
      href: "/system/licenses",
      id: "licenses",
      icon: "bi-journal-check"
    },
    {
      type: "item",
      label: "Ringare",
      href: "/system/actors",
      id: "ringare",
      icon: "bi-person-lines-fill"
    }
  ]
  return (
    <RequireAuth>
      <Sidebar items={navItems}/>
      <ClientProvider>
        <main className="flex-grow-1 p-3 h-100 overflow-auto">
          {children}
        </main>
      </ClientProvider>
    </RequireAuth>
  );
}
