"use client";

import Header from "@/components/Header";
import { useModalsContext } from "@/app/(system)/contexts";

export function PageContent({ children }: { children: React.ReactNode }) {
  const { stack } = useModalsContext();
  const modalOpen = stack.length > 0;
  return (
    <div className="d-flex flex-column vh-100" inert={modalOpen}>
      <Header />
      <div className="flex-grow-1 flex-shrink-1 d-flex overflow-hidden">
        {children}
      </div>
    </div>
  );
}
