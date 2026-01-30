"use client";
import { Client } from "@/app/system/client";
import { ClientContext } from "@/app/system/contexts";
import React, { useMemo } from "react";

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => new Client("http://localhost:3210/api/"), []);

  return (
    <ClientContext.Provider value={client}>{children}</ClientContext.Provider>
  );
}
