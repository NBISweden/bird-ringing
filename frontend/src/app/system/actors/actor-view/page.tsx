"use client"

import { Suspense } from "react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation"
import { useClient } from "../../contexts";
import { ActorLicenseRelation, Role, convertDateToLocale } from "../../common";
import { Client } from "../../client";
import Spinner from "@/components/Spinner";

async function fetchActor(
  [client, _ctx, entryId]: [Client, "actor", string]
) {
  return client.fetchActorById(entryId)
}

function ActorViewBase() {
  const searchParams = useSearchParams();
  const actorId = searchParams.get("entryId")
  const client = useClient()

  const { data, isLoading, error } = useSWR(
    actorId ? [client, "actor", actorId] : null,
    fetchActor
  );

  if (!actorId || error || !data) {
    return (
      <div className="container">
        <h2>Något gick fel.</h2>
        <p>Persondatat kunde inte laddas.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container">
        <Spinner />
      </div>
    )
  }

  const licenses: ActorLicenseRelation[] = data.current_license_relations;
  const roles = new Set<Role>(licenses.map(l => l.role));
  
  return (
    <div className="container">
      <h2>{data.full_name}</h2>
      <p><strong>Typ: </strong>{data.type}</p>
      <p><strong>Roll: </strong>{Array.from(roles).join(", ")}</p>
      <p><strong>E-mail: </strong>{data.email}</p>
      <p><strong>Sex: </strong>{data.sex}</p>
      <p><strong>Latest update: </strong>{convertDateToLocale(data.updated_at)}</p>
    </div>
  )
}

export default function ActorView() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ActorViewBase />
    </Suspense>
  )
}