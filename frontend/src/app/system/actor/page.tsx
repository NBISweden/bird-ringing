"use client"

import { Suspense } from "react";
import { useSearchParams, notFound } from "next/navigation"

function ActorViewBase() {
  const searchParans = useSearchParams();
  const actorId = searchParans.get("entryId")
  if (!actorId) {
    notFound();
  }
  
  return (
    <div>Hello actor {actorId}</div>
  )
}

export default function ActorView() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ActorViewBase />
    </Suspense>
  )
}