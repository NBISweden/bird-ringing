import "@/app/globals.scss";
import "bootstrap-icons/font/bootstrap-icons.css";

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <main className="flex-grow-1 p-3">
          {children}
      </main>
  );
}
