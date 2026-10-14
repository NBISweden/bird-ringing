"use client";

import Link from "next/link";
import { LicenceCommunication } from "@/app/(system)/common";
import { useTranslation } from "@/app/(system)/internationalization";

type LicenseCommunicationListProps = {
  communication: LicenceCommunication[];
};

export function LicenseCommunicationList({
  communication,
}: LicenseCommunicationListProps) {
  const { t } = useTranslation();

  if (!communication?.length) {
    return (
      <p className="text-muted fst-italic">{t("licenseNoCommunication")}</p>
    );
  }

  return (
    <ul className="list-group list-group-flush">
      {communication.map((item, i) => (
        <li className="list-group-item mb-3" key={i}>
          <div className="row align-items-center g-2">
            <div className="col-12 col-md-2 fw-semibold text-capitalize">
              {item.type}
            </div>
            <div className="col-12 col-md-3">
              <i className="bi bi-person text-primary me-1" />
              <Link href={`/actors/entry?entryId=${item.actor_id}`}>
                {item.actor}
              </Link>
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
  );
}
