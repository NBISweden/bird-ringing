"use Client";

import { convertDateToLocale, LicenseCurrent } from "@/app/system/common";
type LicenceViewProps = {
  license: LicenseCurrent;
};

export function LicenceView({ license }: LicenceViewProps) {
  return (
    <>
      <div className="mb-3">
        {/* Header */}
        <div className="card border-primary">
          <div className="card-header">
            <div className="row g-2">
              <div className="col-12 col-md-9">
                <div>
                  <span className="fst-italic">Giltig mellan </span>
                  {license.starts_at} <span className="fst-italic">till </span>{" "}
                  {license.ends_at}
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
                    <span className="me-2">Rapportstatus</span>
                    <span className="badge rounded-pill border border-primary text-primary text-capitalize">
                      {String(license.report_status)}
                    </span>
                  </div>
                  <div className="d-flex gap-3 text-muted small">
                    <span>
                      Skapad {convertDateToLocale(license.created_at)}
                    </span>
                    <span>
                      Uppdaterad {convertDateToLocale(license.updated_at)}
                    </span>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
      {/* Permissions */}
      <div className="mb-3">
        <div className="row">
          {/* Actors */}
          <div className="col-sm-6">
            <div className="card border-primary">
              <div className="card-body">
                <h2 className="h3 card-title">Märkare/hjälpare</h2>
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
                    Inga personer kopplade till licensen.
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="col-sm-6 mb-3 mb-sm-0">
            <div className="card border-primary">
              <div className="card-body">
                <h2 className="h3 card-title">Tillstånd</h2>
                <p className="card-text"></p>
                {license.permissions?.length ? (
                  <ul className="list-group list-group-flush">
                    {license.permissions.map((p, i) => (
                      <li className="list-group-item" key={i}>
                        <div>
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
                        <div>{p.description || " "}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted fst-italic">
                    Inga tillstånd att visa.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Documents */}
      <div className="mb-3">
        <h3 className="h2">Dokument</h3>
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
                    <span className="text-muted small me-2">Referens</span>
                    <span className="badge rounded-pill border border-primary text-primary">
                      {doc.reference}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted fst-italic">
            Inga dokument kopplade till licensen.
          </p>
        )}
      </div>
      {/* Communication */}
      <div className="mb-3">
        <h3 className="h2">Kommunikation</h3>
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
                    <span className="text-muted small me-2">Anteckning</span>
                    <span className="fst-italic">“{item.note}”</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted fst-italic">
            Ingen kommunikation kopplad till licensen.
          </p>
        )}
      </div>
    </>
  );
}
