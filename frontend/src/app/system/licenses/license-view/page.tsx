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

            {/* Only for debugging */}
            <hr />
            <p><strong>Raw response (debug):</strong></p>
            <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(data, null, 2)}</pre>
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
