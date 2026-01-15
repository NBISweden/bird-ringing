"use client";

import {Suspense, useState} from "react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import Spinner from "@/components/Spinner";

import { useClient } from "../../contexts";
import { convertDateToLocale } from "../../common";
import { Client } from "../../client";

async function fetchLicense(
    [client, _ctx, entryId]: [Client, "license", string]
) {
    return client.fetchLicenseSequenceByMnr(entryId);
}

function LicenseViewInner() {
    const params = useSearchParams();
    const entryId = params.get("entryId");
    const client = useClient();

    const { data, isLoading, error } = useSWR(
        entryId ? [client, "license", entryId] : null,
        fetchLicense
    );

    const [historyPage, setHistoryPage] = useState(1);

    if (!entryId || error || !data) {
        return (
            <div className="container">
                <h2>Något gick fel.</h2>
                <p className="text-muted fst-italic">Licenserna kunde inte laddas.</p>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="container">
                <h2>License view: {entryId}</h2>
                <Spinner />
            </div>
        );
    }

    const historyPageSize = 5;
    const history = data.history ?? [];

    const historyPageCount = Math.max(1, Math.ceil(history.length / historyPageSize));

    const clampedHistoryPage = Math.min(historyPage, historyPageCount);
    const start = (clampedHistoryPage - 1) * historyPageSize;
    const historyItems = history.slice(start, start + historyPageSize);

    return (
        <div className="container">
            <div className="row ">
                <div className="col-12 col-xl-10 col-xxl-9">
                    <div className="py-3">
                        <h1 className="h2 mb-1">Licens {data.mnr}</h1>
                        {/* Header */}
                        <div className="card border-primary">
                            <div className="card-header">
                                <div className="row g-2">
                                    <div className="col-12 col-md-9">
                                        <div>
                                            <span className="fst-italic">Giltig mellan </span>
                                            {data.current.starts_at} <span className="fst-italic">till</span>
                                            {" "}{data.current.ends_at}
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-3 fw-light">
                                        <div>{data.current.location || " "}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="card-body">
                                <ul className="list-group list-group-flush">
                                    {data.current.description ? (
                                        <li className="list-group-item">{data.current.description}</li>
                                    ) : null}
                                    <li className="list-group-item ">
                                        <div className="d-flex align-items-center">
                                            <div className="me-auto">
                                                <span className="me-2">Rapportstatus</span>
                                                <span
                                                    className="badge rounded-pill border border-primary text-primary text-capitalize">
                                            {String(data.current.report_status)}
                                          </span>
                                            </div>
                                            <div className="d-flex gap-3 text-muted small">
                                              <span>
                                                Skapad {convertDateToLocale(data.current.created_at)}
                                              </span>
                                              <span>
                                                Uppdaterad {convertDateToLocale(data.current.updated_at)}
                                              </span>
                                            </div>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    {/* Permissions */}
                    <div className="py-3">
                        <div className="row">
                            {/* Actors */}
                            <div className="col-sm-6">
                                <div className="card border-primary">
                                    <div className="card-body">
                                        <h2 className="h3 card-title">Märkare/hjälpare</h2>
                                        {data.current.actors?.length ? (
                                            <ul className="list-group list-group-flush">
                                                {data.current.actors.map((rel, i) => (
                                                    <li className="list-group-item py-3" key={i}>
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
                                            <p className="text-muted fst-italic">Inga personer kopplade till licensen.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="col-sm-6 mb-3 mb-sm-0">
                                <div className="card border-primary">
                                    <div className="card-body">
                                        <h2 className="h3 card-title">Tillstånd</h2>
                                        <p className="card-text"></p>
                                        {data.current.permissions?.length ? (
                                            <ul className="list-group list-group-flush">
                                                {data.current.permissions.map((p, i) => (
                                                    <li className="list-group-item" key={i}>
                                                        <div>
                                                            <strong>{p.type.name}</strong>
                                                            {p.type.description ? (<i
                                                                className="bi bi-info-circle text-primary p-1"
                                                                role="button"
                                                                data-bs-toggle="tooltip"
                                                                data-bs-placement="right"
                                                                title={p.type.description}
                                                            />) : (" ") }
                                                        </div>
                                                        <div>{p.description || " "}</div>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-muted fst-italic">Inga tillstånd att visa.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>

                    </div>
                    {/* Documents */}
                    <div className="py-3">
                        <h3 className="h2">Dokument</h3>
                        {data.current.documents?.length ? (
                            <ul className="list-group list-group-flush">
                                {data.current.documents.map((doc, i) => (
                                    <li className="list-group-item py-3" key={i}>
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
                            <p className="text-muted fst-italic">Inga dokument kopplade till licensen.</p>
                        )}
                    </div>
                    {/* Communication */}
                    <div className="py-3">
                        <h3 className="h2">Kommunikation</h3>
                        {data.current.communication?.length ? (
                            <ul className="list-group list-group-flush">
                                {data.current.communication.map((item, i) => (
                                    <li className="list-group-item py-3" key={i}>
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
                            <p className="text-muted fst-italic">Ingen kommunikation kopplad till licensen.</p>
                        )}
                    </div>
                    {/* History */}
                    <div className="py-3">
                        <h3 className="h2">Historik</h3>
                        {data.history?.length ? (
                            <>
                                <ul className="list-group list-group-flush">
                                    {historyItems.map((h) => (
                                        <li className="list-group-item py-3" key={h.version}>
                                            <div className="row align-items-center g-2">
                                                <div className="col-12 col-lg-8">
                                                    Giltig under {h.starts_at} till {h.ends_at}
                                                </div>
                                                <div className="col-12 col-md-2">
                                                    <span className="badge text-bg-secondary rounded-pill"> Version {h.version}</span>
                                                </div>
                                            </div>

                                        </li>
                                    ))}
                                </ul>
                                {historyPageCount > 1 && (
                                    <nav className="mt-3">
                                        <ul className="pagination">
                                            {Array.from({ length: historyPageCount }, (_, i) => i + 1).map((p) => (
                                                <li key={p} className={`page-item ${p === clampedHistoryPage ? "active" : ""}`}>
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
                            <p className="text-muted fst-italic">Inga tidigare versioner.</p>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}

export default function LicenseViewPage() {
    return (
        <Suspense fallback={<div className="container"><Spinner /></div>}>
            <LicenseViewInner />
        </Suspense>
    );
}
