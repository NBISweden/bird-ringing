"use Client";

import {
  convertDateToLocale,
  convertOnlyDateToLocale,
  LicenseInstance,
} from "@/app/system/common";
import { useClient } from "../app/system/contexts";
import { useSendLicenseEmailAction, useSendLicenseEmailForActorsAction } from "../app/system/licenses/actions";
import { useTranslation } from "@/app/system/internationalization";
import { LicensePermissionItem } from "./LicensePermissionItem";
import { useMemo, useState } from "react";
type LicenceViewProps = {
  license: LicenseInstance;
  mnr: string;
};

export function LicenceView({ license, mnr }: LicenceViewProps) {
  const client = useClient();
  const sendEmailAction = useSendLicenseEmailAction(client);
  const sendEmailForActorsAction = useSendLicenseEmailForActorsAction(client);
  const { t, format } = useTranslation();

  const [selectedActorIds, setSelectedActorIds] = useState(new Set<number>());

  const actorIds = useMemo(() => {
    return (license.actors || []).map((rel) => rel.actor.id);
  }, [license.actors]);

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
                      {String(license.report_status)}
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
              <h2 className="h3 card-title col-5 col-sm-7 col-md-10">
                {t("licenseActors")}
              </h2>
              <button
                className="btn btn-secondary col-5 col-sm-5 col-md-2"
                onClick={() =>
                  sendEmailForActorsAction(
                    mnr,
                    license.actors
                      .filter((rel) => selectedActorIds.has(rel.actor.id))
                      .map((rel) => ({
                        id: rel.actor.id,
                        name: rel.actor.full_name,
                      })),
                  )
                }
              >
                {t("licenseSendLicenses")}
              </button>
            </div>
            {license.actors?.length ? (
              <ul className="list-group list-group-flush">
                {license.actors.map((rel, i) => (
                  <li className="list-group-item mb-3" key={i}>
                    <div className="row align-items-center g-2">
                      <div className="col-12 col-md-3 fw-semibold text-capitalize">
                        {rel.role}
                      </div>
                      <div className="col-12 col-md-9">
                        <div className="d-flex align-items-center">
                          <input
                            className="form-check-input me-2"
                            type="checkbox"
                            checked={selectedActorIds.has(rel.actor.id)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const id = rel.actor.id;
                              setSelectedActorIds((prev) => {
                                const next = new Set(prev);
                                if (checked) {
                                  next.add(id);
                                } else {
                                  next.delete(id);
                                }
                                return next;
                              });
                            }}
                          />
                          <i className="bi bi-person text-primary me-1" />
                          {rel.actor.full_name}({rel.mednr})
                        </div>
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
                    {doc.type}
                  </div>
                  <div className="col-12 col-md-3 text-nowrap">
                    <i className="bi bi-person text-primary me-1" />
                    {doc.actor}
                  </div>
                  <div className="col-12 col-md-5">
                    <span className="text-muted small me-2">
                      {t("licenseDocumentReference")}
                    </span>
                    <span className="badge rounded-pill border border-primary text-primary">
                      {doc.reference}
                    </span>
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
                    {item.type}
                  </div>
                  <div className="col-12 col-md-3 text-nowrap">
                    <i className="bi bi-person text-primary me-1" />
                    {item.actor}
                  </div>
                  <div className="col-12 col-md-2">
                    <span className="badge rounded-pill border border-primary text-primary text-capitalize">
                      {item.status}
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
