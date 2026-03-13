"use client";

import { Suspense } from "react";
import Link from "next/link";
import useSWR from "swr";
import { notFound, useSearchParams } from "next/navigation";
import { useClient } from "../../contexts";
import {
  ActorLicenseRelation,
  Role,
  convertDateToLocale,
  convertOnlyDateToLocale,
} from "../../common";
import { Client } from "../../client";
import Spinner from "@/components/Spinner";
import { useTranslation } from "../../internationalization";
import { Alert } from "@/components/Alert";
import { PaginationContainer, usePagination } from "@/components/Pagination";

async function fetchActor([client, _ctx, entryId]: [Client, "actor", string]) {
  return client.fetchActorById(entryId);
}

function LoadingActor() {
  return (
    <div className="container">
      <Spinner />
    </div>
  );
}

function isLicenseActive(license: ActorLicenseRelation): boolean {
  const today = new Date();
  const startDate = new Date(license.starts_at);
  const endDate = new Date(license.ends_at);
  if (startDate <= today && endDate >= today) {
    return true;
  } else {
    return false;
  }
}

function getActorIcon(type: string): string {
  switch (type) {
    case "person":
      return "person";
    case "station":
      return "buildings";
    default:
      return "";
  }
}

function getGenderIcon(sex: string): string {
  switch (sex) {
    case "female":
      return "gender-female";
    case "male":
      return "gender-male";
    case "undisclosed":
      return "gender-ambiguous";
    default:
      return "";
  }
}

function ActorViewBase() {
  const searchParams = useSearchParams();
  const actorId = searchParams.get("entryId");
  const client = useClient();
  const { t } = useTranslation();

  const { data, isLoading, error } = useSWR(
    actorId ? [client, "actor", actorId] : null,
    fetchActor,
  );

  if (!actorId) {
    notFound();
  }

  if (error) {
    return (
      <div className="container">
        <h2>{t("actorErrorLoadingActorTitle")}</h2>

        <p>{t("actorErrorLoadingActorText", { actorId })}</p>
        <Alert type="danger">
          <p>{error instanceof Error ? error.message : String(error)}</p>
        </Alert>
      </div>
    );
  }

  if (isLoading || !data) {
    return <LoadingActor />;
  }

  const licenses: ActorLicenseRelation[] = data.license_relations;
  licenses.sort((a: ActorLicenseRelation, b: ActorLicenseRelation) => {
    return new Date(b.ends_at).getTime() - new Date(a.ends_at).getTime();
  });

  const previousLicenses: ActorLicenseRelation[] =
    data.previous_license_relations || [];
  previousLicenses.sort((a: ActorLicenseRelation, b: ActorLicenseRelation) => {
    return new Date(b.ends_at).getTime() - new Date(a.ends_at).getTime();
  });
  const previousLicenseGroups = previousLicenses.reduce<
    Record<string, ActorLicenseRelation[]>
  >((acc, l) => {
    const key = `${l.mnr}:${l.mednr}:${l.role}`;
    acc[key] = acc[key] || [];
    acc[key].push(l);
    return acc;
  }, {});

  const roles = new Set<Role>(licenses.map((l) => l.role));

  return (
    <div className="container">
      <div className="row">
        <h2 className="fw-bold">
          <i className={`bi bi-${getActorIcon(data.type)} me-3`} />
          {data.full_name}
        </h2>
        <div className="col-12 col-xl-6">
          <div className="card my-4">
            <div className="card-header d-flex justify-content-between">
              <div>
                <span className="m-0">{Array.from(roles).join(", ")}</span>
                <i className={`bi bi-${getGenderIcon(data.sex)} ms-1`} />
              </div>
              {data.birth_date ? (
                <p className="fst-italic m-0">
                  * {convertOnlyDateToLocale(data.birth_date)}
                </p>
              ) : data.birth_year ? (
                <p className="fst-italic m-0">* {data.birth_year}</p>
              ) : null}
            </div>
            <div className="card-body pb-0">
              <ul className="list-group list-group-flush">
                <li className="list-group-item d-flex">
                  <i className="bi bi-envelope-at-fill me-4" />
                  <div className="d-flex flex-column">
                    {data.email ? (
                      <span>{data.email}</span>
                    ) : (
                      <p className="text-muted fst-italic m-0">
                        {t("actorNoEmailAddress")}
                      </p>
                    )}
                    {data.alternative_email && (
                      <span className="text-muted">
                        {data.alternative_email}
                      </span>
                    )}
                  </div>
                </li>
                <li className="list-group-item d-flex">
                  <i className="bi bi-telephone-fill me-4" />
                  <div className="d-flex flex-column">
                    {data.phone_number1 ? (
                      <span>{data.phone_number1}</span>
                    ) : (
                      <p className="text-muted fst-italic m-0">
                        {t("actorNoPhoneNumber")}
                      </p>
                    )}
                    {data.phone_number2 && (
                      <span className="text-muted">{data.phone_number2}</span>
                    )}
                  </div>
                </li>
                <li className="list-group-item d-flex">
                  <i className="bi bi-house-fill me-4" />
                  <div className="d-flex flex-column">
                    {data.address ? (
                      <span>{data.address}</span>
                    ) : (
                      <p className="text-muted fst-italic m-0">
                        {t("actorNoAddress")}
                      </p>
                    )}
                    {data.co_address && <span>{data.co_address}</span>}
                    {data.postal_code || data.city ? (
                      <span>{data.postal_code + " " + data.city}</span>
                    ) : (
                      <p className="text-muted fst-italic m-0">
                        {t("actorNoCity")}
                      </p>
                    )}
                    {data.country && <span>{data.country}</span>}
                  </div>
                </li>
              </ul>
            </div>
            <p className="text-muted text-end small m-1">
              {t("actorUpdatedAt", {
                date: convertDateToLocale(data.updated_at),
              })}
            </p>
          </div>
        </div>
        <div className="col-12 col-xxl-9">
          <h3 className="pt-4 fw-bold">{t("actorLicenses")}</h3>
          <ul className="list-group list-group-flush">
            <PaginatedLicenses items={licenses.map((l) => [l])} />
          </ul>
        </div>
        <div className="col-12 col-xxl-9">
          <h3 className="pt-4 fw-bold">{t("actorPreviousLicenses")}</h3>
          <ul className="list-group list-group-flush">
            <PaginatedLicenses items={Object.values(previousLicenseGroups)} />
          </ul>
        </div>
      </div>
    </div>
  );
}

function getLicenseGroupKey(licenses: ActorLicenseRelation[]) {
  return licenses.map((l) => `${l.starts_at}${l.mnr}-${l.mednr}`).join(";");
}

function PaginatedLicenses({ items }: { items: ActorLicenseRelation[][] }) {
  const { t } = useTranslation();
  const pagination = usePagination(items, 10, { disableForSinglePage: true });
  return items.length > 0 ? (
    <PaginationContainer
      pages={pagination.pages}
      currentPage={pagination.currentPage}
    >
      {pagination.items.map((l) => (
        <li className="list-group-item" key={getLicenseGroupKey(l)}>
          {l.length > 1 ? (
            <LicenseGroup licenseGroup={l} />
          ) : (
            <LicenseEntry license={l[0]} />
          )}
        </li>
      ))}
    </PaginationContainer>
  ) : (
    <p className="text-muted fst-italic">{t("actorNoCurrentLicenses")}</p>
  );
}

function LicenseGroup({
  licenseGroup,
}: {
  licenseGroup: ActorLicenseRelation[];
}) {
  return (
    <details>
      <summary>
        <LicenseEntry license={licenseGroup[0]} />
      </summary>
      {licenseGroup.slice(1).map((l) => (
        <LicenseEntry key={getLicenseGroupKey([l])} license={l} />
      ))}
    </details>
  );
}

function LicenseEntry({ license }: { license: ActorLicenseRelation }) {
  const { t, format } = useTranslation();
  const {
    starts_at,
    ends_at,
    role,
    communication_type,
    communication_status,
    mnr,
    mednr,
  } = license;
  const licenseIsActive = isLicenseActive(license);
  return (
    <div className="row">
      <div className="py-2 col-3 text-nowrap d-flex flex-column justify-content-center">
        <span>
          <Link href={`/system/licenses/entry?mnr=${mnr}`}>
            {mnr}-{mednr}
          </Link>
        </span>
        <span className="text-secondary small">{role}</span>
      </div>
      <div className="py-2 col-5 d-flex flex-column flex-md-row align-items-center ">
        <div>
          {format("actorLicenseValidityPeriod", {
            startsAt: convertOnlyDateToLocale(starts_at),
            endsAt: convertOnlyDateToLocale(ends_at),
            from: (chunks: React.ReactNode) => (
              <p className="m-0 text-end">{chunks}</p>
            ),
            to: (chunks) => <p className="m-0">{chunks}</p>,
            muted: (chunks) => (
              <span className="text-muted small">{chunks}</span>
            ),
          })}
        </div>
        <div className="ms-3">
          <span
            className={`badge rounded-pill ms-2 ${licenseIsActive ? "text-success-emphasis bg-success-subtle" : "text-dark-emphasis bg-body-secondary"}`}
          >
            {licenseIsActive
              ? t("actorLicenseActive")
              : t("actorLicenseInactive")}
          </span>
        </div>
      </div>
      <div className="py-2 col-4 d-flex align-items-center fw-semibold text-capitalize">
        {communication_type}
        <span className="badge rounded-pill text-primary border border-primary ms-2">
          {communication_status}
        </span>
      </div>
    </div>
  );
}

export default function ActorView() {
  return (
    <Suspense fallback={<LoadingActor />}>
      <ActorViewBase />
    </Suspense>
  );
}
