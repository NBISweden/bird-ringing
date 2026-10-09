"use client";

import Link from "next/link";
import { LicenseDocument } from "@/app/(system)/common";
import { useTranslation } from "@/app/(system)/internationalization";

type LicenseDocumentListProps = {
  documents: LicenseDocument[];
  licenseNumber: string;
};

export function LicenseDocumentList({
  documents,
  licenseNumber,
}: LicenseDocumentListProps) {
  const { t } = useTranslation();

  if (!documents?.length) {
    return <p className="text-muted fst-italic">{t("licenseNoDocuments")}</p>;
  }

  return (
    <ul className="list-group list-group-flush">
      {documents.map((doc, i) => (
        <li className="list-group-item mb-3" key={i}>
          <div className="row align-items-center g-2">
            <div className="col-12 col-md-2 fw-semibold text-capitalize">
              {doc.type}
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
              {doc.type === "license" || doc.type === "permit" ? (
                <a
                  href={`/api/license_sequence/${licenseNumber}/${doc.type === "license" ? "card-pdf" : "permit-pdf"}/?actor_id=${doc.actor_id}`}
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
  );
}
