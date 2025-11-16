import "@/app/globals.scss";
import "bootstrap-icons/font/bootstrap-icons.css";
import Sidebar from "@/components/Sidebar";

export default function SystemLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
          <div className="flex-grow-1 d-flex">
              <Sidebar/>
              <main className="flex-grow-1 p-3">
                  {children}
              </main>
          </div>
  );
}
