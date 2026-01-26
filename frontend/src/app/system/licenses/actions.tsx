import { useCallback, useState } from "react";
import { ClientContext, useClient, useModalsContext } from "../contexts";
import { Client } from "../client";
import Spinner from "@/components/Spinner";
import { Alert } from "@/components/Alert";

type BatchCreateResponse = { filenames: string[] };

function LicenseDocBatchCreate({ mnrs }: { mnrs: string[] }) {
  const client = useClient();
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<BatchCreateResponse | null>(null);
  const [error, setError] = useState<unknown>(null);

  const run = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await client.batchCreateLicenseCards(mnrs);
      setData(res);
    } catch (e) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, [client, mnrs]);

  return (
    <>
      <div className="mb-2">
        <strong>Selected licenses:</strong> {mnrs.join(", ")}
      </div>

      <div className="d-flex gap-2 align-items-center">
        <button
          className="btn btn-primary"
          onClick={run}
          disabled={isLoading || mnrs.length === 0}
        >
          Create license cards (all ringers + helpers)
        </button>
        {isLoading ? <Spinner /> : null}
      </div>

      {error ? (
        <div className="mt-3">
          <Alert type="danger">{String(error)}</Alert>
        </div>
      ) : null}

      {data ? (
        <div className="mt-3">
          <div><strong>Created/updated:</strong> {data.filenames.length}</div>
          <div className="mt-2">
            <textarea
              className="form-control"
              rows={8}
              readOnly
              value={data.filenames.join("\n")}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

export function useBatchCreateLicenseCardsAction(client: Client) {
  const modalStack = useModalsContext();

  return useCallback((itemIds: Set<string>) => {
    modalStack.add({
      title: "Create license cards (batch)",
      content: (
        <ClientContext.Provider value={client}>
          <LicenseDocBatchCreate mnrs={Array.from(itemIds)} />
        </ClientContext.Provider>
      ),
      actions: [{ label: "Close", action: () => {}, type: "primary" }],
    });
  }, [modalStack, client]);
}

export function useDownloadLicenseCardsZipAction(client: Client) {
  const modalStack = useModalsContext();

  return useCallback((itemIds: Set<string>) => {
    const mnrs = Array.from(itemIds);
    if (mnrs.length === 0) return;

    const modal = modalStack.add({
      title: "Download license cards (ZIP)",
      content: (
        <>
          <Spinner />
          <span className="ms-3">Preparing download…</span>
        </>
      ),
      actions: [{ label: "Stäng", action: () => {}, type: "primary" }],
    });

    const url = client.getLicenseCardsZipUrl(mnrs);
    window.location.href = url;

    setTimeout(() => modalStack.remove(modal), 300);
  }, [modalStack, client]);
}