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
      label: "Dashboard",
      href: "/system/dashboard/",
      id: "dashboard",
      icon: "bi-speedometer"
    },
    {
      type: "item",
      label: "Licenses",
      href: "/system/licenses/",
      id: "licenses",
      icon: "bi-journal-check"
    },
    {
      type: "item",
      label: "Ringare",
      href: "/system/actors/",
      id: "ringare",
      icon: "bi-person-lines-fill"
    }
  ]
  return (
    <div className="flex-grow-1 d-flex">
      <UserProvider>
        <RequireAuth>
          <Sidebar items={navItems}/>
            <ClientProvider>
              <main className="flex-grow-1 p-3">
                {children}
              </main>
            </ClientProvider>
        </RequireAuth>
      </UserProvider>
    </div>
  );
}
