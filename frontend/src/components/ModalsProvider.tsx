"use client"
import { ModalsContext, useModalStack } from "@/app/system/contexts";
import React from "react";

export function ModalsProvider({children}: {children: React.ReactNode}) {
  const modalStack = useModalStack();

  return (
    <ModalsContext.Provider value={modalStack}>
        {children}
    </ModalsContext.Provider>
  )
}