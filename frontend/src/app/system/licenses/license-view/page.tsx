"use client";

import {Suspense, useState} from "react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import Spinner from "@/components/Spinner";

import { useClient } from "../../contexts";
import { convertDateToLocale } from "../../common";
import { Client } from "../../client";
import {LicenceView} from "@/components/LicenceView";

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
                    <div>
                        <h1 className="h2 mb-1">Licens {data.mnr}</h1>
                    </div>
                    <LicenceView license={data.current}/>
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
