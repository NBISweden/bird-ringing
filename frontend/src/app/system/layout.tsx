
import Sidebar, { NavItem } from "@/components/Sidebar";
import { UserProvider, RequireAuth } from "../../components/UserProvider";
import { ClientProvider } from "@/components/ClientProvider";

export default function SystemLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const navItems: NavItem[] = [
    {
      type: "item",
      href: "/system/welcome/",
      id: "dashboard",
      icon: "bi-speedometer"
    },
    {
      type: "item",
      href: "/system/licenses/",
      id: "licenseListView",
      icon: "bi-journal-check"
    },
    {
      type: "item",
      href: "/system/actors/",
      id: "ringerListView",
      icon: "bi-person-lines-fill"
    }
  ]
  return (
    <UserProvider>
      <RequireAuth>
        <Sidebar items={navItems}/>
        <ClientProvider>
          <main className="flex-grow-1 p-3 h-100 overflow-auto">
            {children}
          </main>
        </ClientProvider>
      </RequireAuth>
    </UserProvider>
  );
}
