"use Client";

import {
  convertDateToLocale,
  convertOnlyDateToLocale,
  LicenseCurrent,
} from "@/app/system/common";
import { useTranslation } from "@/app/system/internationalization";
type LicenceViewProps = {
  license: LicenseCurrent;
};

export function LicenceView({ license }: LicenceViewProps) {
  const { t, format } = useTranslation();
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
      {/* Permissions */}
      <div className="mb-4">
        <div className="row">
          <div className="mb-3 mb-sm-0">
            <div className="card border-primary">
              <div className="card-body">
                <h2 className="h3 card-title">{t("licensePermissions")}</h2>
                <p className="card-text"></p>
                {license.permissions?.length ? (
                  <ul className="list-group list-group-flush">
                    {license.permissions.map((p, i) => (
                      <li className="list-group-item mb-3" key={i}>
                        <div className="pb-2">
                          <strong>{p.type.name}</strong>
                          {p.type.description ? (
                            <i
                              className="bi bi-info-circle text-primary p-1"
                              role="button"
                              data-bs-toggle="tooltip"
                              data-bs-placement="right"
                              title={p.type.description}
                            />
                          ) : (
                            " "
                          )}
                        </div>
                        <div className="row mb-3">
                          <div className="col-12 col-lg-6">
                            {p.location && (
                              <div className="py-1">
                                <i className="bi bi-geo-alt text-primary me-1" />{" "}
                                {p.location}
                              </div>
                            )}
                            {(p.starts_at || p.ends_at) && (
                              <div className="py-1 d-flex">
                                <i className="bi bi-calendar2-week text-primary me-2" />
                                {p.starts_at && p.ends_at ? (
                                  <p className="m-0">
                                    {p.starts_at}{" "}
                                    <span className="fst-italic mx-1">
                                      {" "}
                                      till{" "}
                                    </span>{" "}
                                    {p.ends_at}
                                  </p>
                                ) : !p.starts_at ? (
                                  <p className="m-0">
                                    <span className="fst-italic mx-1">
                                      {" "}
                                      until{" "}
                                    </span>{" "}
                                    {p.ends_at}
                                  </p>
                                ) : !p.ends_at ? (
                                  <p className="m-0">
                                    <span className="fst-italic mx-1">
                                      {" "}
                                      from{" "}
                                    </span>
                                    {p.starts_at}
                                  </p>
                                ) : (
                                  <></>
                                )}
                              </div>
                            )}
                            {p.species.length > 0 && (
                              <div className="py-1">
                                <i className="bi bi-twitter text-primary me-1" />{" "}
                                {p.species.join(", ")}
                              </div>
                            )}
                            {p.description && (
                              <div className="pt-3">{p.description}</div>
                            )}
                          </div>
                          <div className="col-12 col-lg-6 py-3 py-lg-0">
                            {p.properties.length > 0 && (
                              <div>
                                {p.properties.map((p, i) => (
                                  <p className="my-1 fst-italic" key={i}>
                                    &bull; {p.name}{" "}
                                    {p.description ? (
                                      <i
                                        className="bi bi-info-circle text-primary p-1"
                                        role="button"
                                        data-bs-toggle="tooltip"
                                        data-bs-placement="right"
                                        title={p.description}
                                      />
                                    ) : (
                                      " "
                                    )}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
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
      </div>
      <div className="row mb-4">
        {/* Actors */}
        <div>
          <div className="card border-primary">
            <div className="card-body">
              <h2 className="h3 card-title">{t("licenseActors")}</h2>
              {license.actors?.length ? (
                <ul className="list-group list-group-flush">
                  {license.actors.map((rel, i) => (
                    <li className="list-group-item mb-3" key={i}>
                      <div className="row align-items-center g-2">
                        <div className="col-12 col-md-3 fw-semibold text-capitalize">
                          {rel.role}
                        </div>
                        <div className="col-12 col-md-9">
                          <i className="bi bi-person text-primary me-1" />
                          {rel.actor.full_name}({rel.mednr})
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
