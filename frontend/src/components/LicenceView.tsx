"use Client";

import Link from "next/link";
import {
  convertDateToLocale,
  convertOnlyDateToLocale,
  LicenseInstance,
} from "@/app/(system)/common";
import { useClient } from "../app/(system)/contexts";
import { useSendLicenseEmailForActorsAction } from "../app/(system)/licenses/actions";
import { useTranslation } from "@/app/(system)/internationalization";
import { LicensePermissionItem } from "./LicensePermissionItem";
import { useState } from "react";
import * as options from "@/app/(system)/options";

type LicenceViewProps = {
  license: LicenseInstance;
  mnr: string;
};

export function LicenceView({ license, mnr }: LicenceViewProps) {
  const client = useClient();

  const sendEmailForActorsAction = useSendLicenseEmailForActorsAction(client);
  const { t, format, formatOption } = useTranslation();

  const [selectedActorIds, setSelectedActorIds] = useState(new Set<number>());
  const [notifyRinger, setNotifyRinger] = useState(false);

  const isSelectableRelation = (rel: LicenseInstance["actors"][number]) => {
    const roleOk = rel.role.id === "ringer" || rel.role.id === "associate ringer";
    if (!roleOk) return false;

    // Do not allow selecting the ringer if the ringer is a station
    if (rel.role.id === "ringer" && rel.actor.type.id === "station") return false;

    return true;
  };

  const hasSelectedAssociateRinger = license.actors.some(
    (rel) =>
      rel.role.id === "associate ringer" && selectedActorIds.has(rel.actor.id),
  );
  const effectiveNotifyRinger = notifyRinger && hasSelectedAssociateRinger;

  return (
    <>
      <div className="mb-4">
        {/* Header */}
        <div className="card border-primary">
          <div className="card-header">
            <div className="row g-2">
              <div className="col-12 col-md-9">
                <div>
                  {format("licenseValidityPeriod", {
                    startsAt: convertOnlyDateToLocale(license.starts_at),
                    endsAt: convertOnlyDateToLocale(license.ends_at),
                    from: (chunks) => (
                      <span className="fst-italic">{chunks}</span>
                    ),
                    to: (chunks) => (
                      <span className="fst-italic">{chunks}</span>
                    ),
                  })}
                </div>
              </div>
              <div className="col-12 col-md-3 fw-light">
                <div>{license.location || " "}</div>
              </div>
            </div>
          </div>
          <div className="card-body">
            <ul className="list-group list-group-flush">
              {license.description ? (
                <li className="list-group-item">{license.description}</li>
              ) : null}
              <li className="list-group-item ">
                <div className="d-flex align-items-center">
                  <div className="me-auto">
                    <span className="me-2">{t("licenseReportStatus")}</span>
                    <span className="badge rounded-pill border border-primary text-primary text-capitalize">
                      {formatOption(license.report_status.id, options.licenseReportStatus)}
                    </span>
                  </div>
                  <div className="d-flex gap-3 text-muted small">
                    <span>
                      {t("licenseCreatedAt", {
                        date: convertDateToLocale(license.created_at),
                      })}
                    </span>
                    <span>
                      {t("licenseUpdatedAt", {
                        date: convertDateToLocale(license.updated_at),
                      })}
                    </span>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="row g-1 mb-4">
        {/* Actors */}
        <div className="card border-primary">
          <div className="card-body">
            <div className="row">
              <h2 className="h3 card-title col-5 col-sm-7 col-md-7">
                {t("licenseActors")}
              </h2>
              <div className="col-7 col-sm-7 col-md-3 d-flex align-items-center justify-content-end">
                <div className="form-check m-0">
                  <input
                    className="form-check-input border border-dark"
                    type="checkbox"
                    checked={effectiveNotifyRinger}
                    disabled={!hasSelectedAssociateRinger}
                    onChange={(e) => setNotifyRinger(e.target.checked)}
                    id="notify-ringer"
                  />
                  <label
                    className={`form-check-label small text-muted ${!hasSelectedAssociateRinger ? "opacity-50" : ""}`}
                    htmlFor="notify-ringer"
                    title={t("licenseNotifyRingerHelp")}
                  >
                    {t("licenseNotifyRinger")}
                  </label>
                </div>
              </div>
              <div className="col-5 col-sm-5 col-md-2">
                <button
                  className="btn btn-secondary w-100"
                  onClick={() =>
                    sendEmailForActorsAction(
                      mnr,
                      license.actors
                        .filter((rel) => isSelectableRelation(rel))
                        .filter((rel) => selectedActorIds.has(rel.actor.id))
                        .map((rel) => ({
                          id: rel.actor.id,
                          name: rel.actor.full_name,
                        })),
                      effectiveNotifyRinger,
                    )
                  }
                >
                  {t("licenseSendLicenses")}
                </button>
              </div>
            </div>
            {license.actors?.length ? (
              <ul className="list-group list-group-flush">
                {license.actors.map((rel, i) => (
                  <li className="list-group-item mb-3" key={i}>
                    <div className="row align-items-center g-2">
                      <div className="col-12 col-md-3 fw-semibold text-capitalize">
                        {formatOption(rel.role.id, options.actorRole)}
                      </div>
                      <div className="col-10 col-md-7">
                        <i className="bi bi-person text-primary me-1" />
                        <Link href={`/actors/entry?entryId=${rel.actor.id}`}>
                          {rel.actor.full_name}
                        </Link>
                        ({rel.mednr})
                      </div>
                      <div className="col-2 col-md-2 d-flex justify-content-center">
                        {isSelectableRelation(rel) ? (
                          <input
                            className="form-check-input border border-dark"
                            type="checkbox"
                            checked={selectedActorIds.has(rel.actor.id)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const id = rel.actor.id;
                              setSelectedActorIds((prev) => {
                                const next = new Set(prev);
                                if (checked) next.add(id);
                                else next.delete(id);
                                return next;
                              });
                            }}
                          />
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted fst-italic">
                {t("licenseNoConnectedActors")}
              </p>
            )}
          </div>
        </div>
      </div>
      {/* Permissions */}
      <div className="mb-4">
        <div className="row g-1">
          <div className="mb-3 mb-sm-0 card border-primary">
            <div className="card-body">
              <h2 className="h3 card-title">{t("licensePermissions")}</h2>
              <p className="card-text"></p>
              {license.permissions?.length ? (
                <ul className="list-group list-group-flush">
                  {license.permissions.map((p, i) => (
                    <li className="list-group-item mb-3" key={i}>
                      <LicensePermissionItem permission={p} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted fst-italic">
                  {t("licenseNoPermissions")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Documents */}
      <div className="mb-3 pt-3">
        <h3 className="h2">{t("licenseDocuments")}</h3>
        {license.documents?.length ? (
          <ul className="list-group list-group-flush">
            {license.documents.map((doc, i) => (
              <li className="list-group-item mb-3" key={i}>
                <div className="row align-items-center g-2">
                  <div className="col-12 col-md-2 fw-semibold text-capitalize">
                    {formatOption(doc.type.id, options.documentType)}
                  </div>
                  <div className="col-12 col-md-3">
                    <i className="bi bi-person text-primary me-1" />
                    <Link href={`/actors/entry?entryId=${doc.actor_id}`}>
                      {doc.actor}
                    </Link>
                  </div>
                  <div className="col-12 col-md-5">
                    <span className="text-muted small me-2">
                      {t("licenseDocumentReference")}
                    </span>
                    {doc.type.id === "license" || doc.type.id === "permit" ? (
                      <a
                        href={`/api/license_sequence/${mnr}/${doc.type.id === "license" ? "card-pdf" : "permit-pdf"}/?actor_id=${doc.actor_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="badge rounded-pill border border-primary text-primary text-decoration-none"
                      >
                        {doc.reference}
                      </a>
                    ) : (
                      <span className="badge rounded-pill border border-primary text-primary">
                        {doc.reference}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted fst-italic">{t("licenseNoDocuments")}</p>
        )}
      </div>
      {/* Communication */}
      <div className="mb-3">
        <h3 className="h2">{t("licenseCommunication")}</h3>
        {license.communication?.length ? (
          <ul className="list-group list-group-flush">
            {license.communication.map((item, i) => (
              <li className="list-group-item mb-3" key={i}>
                <div className="row align-items-center g-2">
                  <div className="col-12 col-md-2 fw-semibold text-capitalize">
                    {formatOption(item.type.id, options.communicationType)}
                  </div>
                  <div className="col-12 col-md-3">
                    <i className="bi bi-person text-primary me-1" />
                    <Link href={`/actors/entry?entryId=${item.actor_id}`}>
                      {item.actor}
                    </Link>
                  </div>
                  <div className="col-12 col-md-2">
                    <span className="badge rounded-pill border border-primary text-primary text-capitalize">
                      {formatOption(item.status.id, options.communicationStatus)}
                    </span>
                  </div>
                  <div className="col-12 col-md-5">
                    <span className="text-muted small me-2">
                      {t("licenseCommunicationNote")}
                    </span>
                    <span className="fst-italic">“{item.note}”</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted fst-italic">{t("licenseNoCommunication")}</p>
        )}
      </div>
    </>
  );
}
