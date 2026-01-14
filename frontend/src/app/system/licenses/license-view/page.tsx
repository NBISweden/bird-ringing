"use client";

import { Suspense } from "react";
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

    if (!entryId) {
        return (
            <div className="container">
                <h2>License view</h2>
                <p>Saknar entryId i URL:en.</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="container">
                <h2>License view: {entryId}</h2>
                <Spinner />
            </div>
        );
    }

    if (error) {
        return (
            <div className="container">
                <h2>License view: {entryId}</h2>
                <p>Kunde inte ladda licensen.</p>
                <pre>{String(error)}</pre>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="container">
                <h2>License view: {entryId}</h2>
                <p>Ingen data.</p>
            </div>
        );
    }

    return (
        <div className="container">
            <h2>License view</h2>

            <p><strong>Mnr:</strong> {data.mnr}</p>
            <p><strong>Created at:</strong> {convertDateToLocale(data.current.created_at)}</p>
            <p><strong>Updated at:</strong> {convertDateToLocale(data.current.updated_at)}</p>

            <p>
                <strong>Period:</strong>{" "}
                {data.current.starts_at} to {data.current.ends_at}
            </p>

            <p><strong>Description:</strong></p>
            <pre style={{ whiteSpace: "pre-wrap" }}>{data.current.description || "-"}</pre>

            <p><strong>Region (location):</strong></p>
            <pre style={{ whiteSpace: "pre-wrap" }}>{data.current.location || "-"}</pre>

            <p><strong>Final report status:</strong> {String(data.current.report_status)}</p>

            <h3>Permissions</h3>

            {data.current.permissions?.length ? (
                <ul>
                    {data.current.permissions.map((p, i) => (
                        <li key={i}>
                            <div>
                                <strong>{p.type.name}</strong>
                            </div>
                            <div>{p.type.description || "-"}</div>
                            <div>{p.description || "-"}</div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p>Inga permissions.</p>
            )}

            <h3>Actors</h3>

            {data.current.actors?.length ? (
                <ul>
                    {data.current.actors.map((rel, i) => (
                        <li key={i}>
                            <div><strong>Full name:</strong> {rel.actor.full_name}</div>
                            <div><strong>Role:</strong> {rel.role}</div>
                            <div><strong>Mednr:</strong> {rel.mednr}</div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p>Inga actors kopplade till licensen.</p>
            )}

            <h3>Documents</h3>

            {data.current.documents?.length ? (
                <ul>
                    {data.current.documents.map((doc, i) => (
                        <li key={i}>
                            <div><strong>Actor:</strong> {doc.actor}</div>
                            <div><strong>Type:</strong> {doc.type}</div>
                            <div><strong>Reference:</strong> {doc.reference}</div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p>Inga dokument kopplade till licensen.</p>
            )}

            <h3>Communications</h3>

            {data.current.communication?.length ? (
                <ul>
                    {data.current.communication.map((item, i) => (
                        <li key={i}>
                            <div><strong>Actor:</strong> {item.actor}</div>
                            <div><strong>Type:</strong> {item.type}</div>
                            <div><strong>Status:</strong> {item.status}</div>
                            <div><strong>Note:</strong> {item.note}</div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p>Ingen kommunikation kopplad till licensen.</p>
            )}

            <h3>Tidigare versioner</h3>

            {data.history?.length ? (
                <ul>
                    {data.history.map((h) => (
                        <li key={h.version}>
                            <div><strong>Version:</strong> {h.version}</div>
                            <div><strong>Period:</strong> {h.starts_at} to {h.ends_at}</div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p>Inga tidigare versioner.</p>
            )}




             {/*Only for debugging*/}
           {/* <hr />
            <p><strong>Raw response (debug):</strong></p>
            <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(data, null, 2)}</pre>*/}
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
