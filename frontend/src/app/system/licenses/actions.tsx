import { useCallback } from "react";
import { ClientContext, useClient, useModalsContext } from "../contexts";
import { Client } from "../client";
import Spinner from "@/components/Spinner";
import { Alert } from "@/components/Alert";
import useSWR from "swr";
import { downloadData } from "../utils";

type BatchCreateResponse = { filenames: string[] };

async function batchCreateLicenseDocs([client, mnrs]: [
  Client,
  string[],
]): Promise<BatchCreateResponse> {
  const files = await client.batchCreateLicenseCards(mnrs);
  return files;
}

function fetchLicenseCardsZip([client, mnrs]: [
  Client,
  string[],
]): Promise<Blob> {
  return client.fetchLicenseCardsZipBlob(mnrs);
}

function LicenseDocBatchCreate({ mnrs }: { mnrs: string[] }) {
  const client = useClient();

  const { data, isLoading, error } = useSWR(
    [client, mnrs],
    batchCreateLicenseDocs,
    { fallbackData: { filenames: [] } },
  );

  return isLoading ? (
    <>
      <Spinner />
      <span className="ms-3">Loading email listings</span>
    </>
  ) : error ? (
    <Alert type="danger">{String(error)}</Alert>
  ) : (
    <textarea
      className="form-control"
      rows={8}
      readOnly
      value={data.filenames.join("\n")}
    />
  );
}

export function useBatchCreateLicenseCardsAction(client: Client) {
  const modalStack = useModalsContext();

  const createLicenseCards = useCallback(
    (itemIds: Set<string>) => {
      modalStack.add({
        title: "Creating license cards (batch)",
        content: (
          <ClientContext.Provider value={client}>
            <LicenseDocBatchCreate mnrs={Array.from(itemIds)} />
          </ClientContext.Provider>
        ),
        actions: [{ label: "Ok", action: () => {}, type: "primary" }],
      });
    },
    [modalStack, client],
  );

  return useCallback(
    (itemIds: Set<string>) => {
      if (itemIds.size === 0) return;
      modalStack.add({
        title: "Do you want to create license cards?",
        content: (
          <>
            <p>
              Do you want to create license cards for all ringers and helpers
              for selected licenses?
            </p>
            <p>
              <strong>Selected licenses:</strong>{" "}
              {Array.from(itemIds).join(", ")}
            </p>
          </>
        ),
        actions: [
          { label: "Abort", action: () => {}, type: "secondary" },
          {
            label: "Create license cards",
            action: () => createLicenseCards(itemIds),
            type: "primary",
          },
        ],
      });
    },
    [modalStack, createLicenseCards],
  );
}

function DownloadModal<T>({
  downloadFunc,
  filename,
  params,
}: {
  downloadFunc: (params: [Client, T]) => Promise<Blob>;
  filename: string;
  params: T;
}) {
  const client = useClient();

  const downloadExec = useCallback(
    async ([c, filename, p]: [Client, string, T]) => {
      const blob = await downloadFunc([c, p]);
      downloadData(blob, filename);
    },
    [downloadFunc],
  );

  const { isLoading, error } = useSWR([client, filename, params], downloadExec);

  return (
    <>
      {isLoading ? (
        <Alert type="info">
          <Spinner />
          <span className="ms-3">Preparing download…</span>
        </Alert>
      ) : error ? (
        <Alert type="danger">
          {error instanceof Error ? error.message : String(error)}
        </Alert>
      ) : (
        <Alert type="success">Download successful</Alert>
      )}
    </>
  );
}

export function useDownloadLicenseCardsZipAction(client: Client) {
  const modalStack = useModalsContext();

  return useCallback(
    (itemIds: Set<string>) => {
      const mnrs = Array.from(itemIds);
      if (mnrs.length === 0) return;

      modalStack.add({
        title: "Download license cards (ZIP)",
        content: (
          <ClientContext.Provider value={client}>
            <p>Downloading license cards for licenses:</p>
            <ul>
              {mnrs.map((mnr) => (
                <li key={mnr}>{mnr}</li>
              ))}
            </ul>
            <DownloadModal
              filename="license-cards.zip"
              downloadFunc={fetchLicenseCardsZip}
              params={mnrs}
            />
          </ClientContext.Provider>
        ),
        actions: [{ label: "Close", action: () => {}, type: "primary" }],
      });
    },
    [modalStack, client],
  );
}
