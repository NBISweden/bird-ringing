"use client"

import { Suspense } from "react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation"
import { useClient } from "../../contexts";
import { ActorLicenseRelation, Role, convertDateToLocale, convertOnlyDateToLocale } from "../../common";
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
  const get_license_status = (license: ActorLicenseRelation): string => {
    const today = new Date()
    const endDate = new Date(license.ends_at)
    if (endDate >= today) {
      return "active"
    } else {
      return "inactive"
    }
  }
  const get_actor_icon = (type: string): string => {
    if (type == "person") {
      return "person"
    }
    if (type == "station") {
      return "buildings"
    } else {
      return ""
    }
  }
  const get_gender_icon = (sex: string): string => {
    if (sex == "female") {
      return "gender-female"
    }
    if (sex == "male") {
      return "gender-male"
    }
    if (sex == "undisclosed") {
      return "gender-ambiguous"
    } else {
      return ""
    }
  }
  
  return (
    <div className="container">
          <h2>
            <i className={`bi bi-${get_actor_icon(data.type)} me-3`} />
            {data.full_name}
          </h2>
      <div className="card my-4">
        <div className="card-header d-flex justify-content-between">
          <div>
            <span className="m-0">{Array.from(roles).join(", ")}</span>
            <i className={`bi bi-${get_gender_icon(data.sex)} ms-1`}/>
          </div>
          <p className="fst-italic m-0">* {convertOnlyDateToLocale(data.birth_date)}</p>
        </div>
        <div className="card-body pb-0">
          <ul className="list-group list-group-flush">
            <li className="list-group-item d-flex">
              <i className="bi bi-envelope-at-fill me-4"/>
              <div className="d-flex flex-column">
                <span>{data.email}</span>
                {data.alternative_email && <span className="text-muted">{data.alternative_email}</span>}
              </div>
            </li>
            <li className="list-group-item d-flex">
              <i className="bi bi-telephone-fill me-4"/>
              <div className="d-flex flex-column">
                <span>{data.phone_number1}</span>
                {data.phone_number2 && <span className="text-muted">{data.phone_number2}</span>}
              </div>
            </li>
            <li className="list-group-item d-flex">
              <i className="bi bi-house-fill me-4"/>
              <div className="d-flex flex-column">
                <span>{data.address}</span>
                {data.co_address && <span>{data.co_address}</span>}
                <span>{data.postal_code} {data.city}</span>
                {data.country && <span>{data.country}</span>}
              </div>
            </li>
          </ul>
        </div>
          <p className="text-muted text-end small m-1">
            Uppdaterad {convertDateToLocale(data.updated_at)}
          </p>
      </div>
      <h3>Licenser</h3>
      <ul className="list-group list-group-flush">
      {licenses.map(l => (
        <li className="list-group-item d-flex flex-row">
              <div className="py-2 px-4" key={`${l.mnr}-${l.mednr}`}>{l.mnr}</div>
              <div className="py-2 px-4">{l.mednr}</div>
              <div className="py-2 px-4">{l.role}</div>
              <div className="py-2 px-4">{l.version}</div>
              <div className="py-2 px-4">{l.starts_at}</div>
              <div className="py-2 px-4">{l.ends_at}</div>
              <div className="py-2 px-4">{get_license_status(l)}</div>
              <div className="py-2 px-4">{l.communication_type}</div>
              <div className="py-2 px-4">{l.communication_status}</div>
          </li>

      ))}
      </ul>
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