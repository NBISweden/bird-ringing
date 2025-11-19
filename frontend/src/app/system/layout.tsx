import Sidebar from "@/components/Sidebar";
import { UserProvider, ReuqireAuth } from "../../components/UserProvider";

export default function SystemLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex-grow-1 d-flex">
      <UserProvider>
        <ReuqireAuth>
          <Sidebar/>
          <main className="flex-grow-1 p-3">
            {children}
          </main>
        </ReuqireAuth>
      </UserProvider>
    </div>
  );
}
