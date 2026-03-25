"use client";
import { Client } from "@/app/(system)/client";
import { ClientContext, useConfig } from "@/app/(system)/contexts";
import React, { useMemo } from "react";

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const { apiRootUrl } = useConfig();
  const client = useMemo(() => new Client(apiRootUrl), [apiRootUrl]);

  return (
    <ClientContext.Provider value={client}>{children}</ClientContext.Provider>
  );
}
