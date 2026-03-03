"use client";

import { Suspense, useState } from "react";
import useSWR from "swr";
import { notFound, useSearchParams } from "next/navigation";
import Spinner from "@/components/Spinner";

import { useClient } from "../../contexts";
import { Client } from "../../client";
import { LicenceView } from "@/components/LicenceView";
import { Alert } from "@/components/Alert";
import { useTranslation } from "../../internationalization";
import { convertOnlyDateToLocale } from "../../common";
import { Badge } from "@/components/Badge";

async function fetchLicense([client, _ctx, entryId]: [
  Client,
  "license",
  string,
]) {
  return client.fetchLicenseSequenceByMnr(entryId);
}

function LicenseViewInner() {
  const params = useSearchParams();
  const mnr = params.get("mnr");
  const client = useClient();
  const { t, format, formatOption } = useTranslation();

  const { data, isLoading, error } = useSWR(
    mnr ? [client, "license", mnr] : null,
    fetchLicense,
  );

  const [historyPage, setHistoryPage] = useState(1);

  if (!mnr) {
    notFound();
  }

  if (error) {
    return (
      <div className="container">
        <h2>{t("licenseErrorLoadingLicenseTitle")}</h2>

        <p>{t("licenseErrorLoadingLicenseText", { licenseId: mnr })}</p>
        <Alert type="danger">
          <p>{error instanceof Error ? error.message : String(error)}</p>
        </Alert>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="container">
        <h2>{t("licenseView", { licenseId: mnr, licenseHolder: "-" })}</h2>
        <Spinner />
      </div>
    );
  }

  const historyPageSize = 5;
  const history = data.history ?? [];

  const historyPageCount = Math.max(
    1,
    Math.ceil(history.length / historyPageSize),
  );

  const clampedHistoryPage = Math.min(historyPage, historyPageCount);
  const start = (clampedHistoryPage - 1) * historyPageSize;
  const historyItems = history.slice(start, start + historyPageSize);

  return (
    <div className="container">
      <div className="row ">
        <div className="col-12 col-xl-10 col-xxl-9">
          <h1 className="h2">
            {t("licenseView", {
              licenseId: data.mnr,
              licenseHolder: data.license_holder,
            })}
            <Badge
              rounded
              outline
              color="primary"
              className="inline-block ms-4"
            >
              {formatOption(String(data.latest.report_status), {
                yes: "licenseReportStatusYes",
                no: "licenseReportStatusNo",
                incomplete: "licenseReportStatusIncomplete",
              })}
            </Badge>
          </h1>
          <LicenceView license={data.latest} mnr={data.mnr} />
          {/* History */}
          <div className="py-3">
            <h3 className="h2">{t("licenseHistory")}</h3>
            {data.history?.length ? (
              <>
                <ul className="list-group list-group-flush">
                  {historyItems.map((h) => (
                    <li className="list-group-item py-3" key={h.version}>
                      <div className="row align-items-center g-2">
                        <div className="col-12 col-lg-8">
                          {format("licenseValidityPeriod", {
                            startsAt: convertOnlyDateToLocale(h.starts_at),
                            endsAt: convertOnlyDateToLocale(h.ends_at),
                            from: (chunks) => (
                              <span className="fst-italic">{chunks}</span>
                            ),
                            to: (chunks) => (
                              <span className="fst-italic">{chunks}</span>
                            ),
                          })}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                {historyPageCount > 1 && (
                  <nav className="mt-3">
                    <ul className="pagination">
                      {Array.from(
                        { length: historyPageCount },
                        (_, i) => i + 1,
                      ).map((p) => (
                        <li
                          key={p}
                          className={`page-item ${p === clampedHistoryPage ? "active" : ""}`}
                        >
                          <button
                            type="button"
                            className="page-link"
                            onClick={() => setHistoryPage(p)}
                          >
                            {p}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </nav>
                )}
              </>
            ) : (
              <p className="text-muted fst-italic">
                {t("licenseNoPreviousVerions")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LicenseViewPage() {
  return (
    <Suspense
      fallback={
        <div className="container">
          <Spinner />
        </div>
      }
    >
      <LicenseViewInner />
    </Suspense>
  );
}
