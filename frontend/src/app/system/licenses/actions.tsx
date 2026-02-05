import { useCallback } from "react";
import { ClientContext, useClient, useModalsContext } from "../contexts";
import { Client } from "../client";
import Spinner from "@/components/Spinner";
import { Alert } from "@/components/Alert";
import { downloadData } from "../utils";
import useSWRImmutable from "swr/immutable";
import { useTranslation } from "../internationalization";

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
  const { t } = useTranslation();

  const { data, isLoading, error } = useSWRImmutable(
    [client, mnrs],
    batchCreateLicenseDocs,
  );

  return isLoading ? (
    <>
      <Spinner />
      <span className="ms-3">{t("licenseCreatingLicenseDocuments")}</span>
    </>
  ) : error ? (
    <Alert type="danger">{String(error)}</Alert>
  ) : (
    <textarea
      className="form-control"
      rows={8}
      readOnly
      value={data?.filenames.join("\n")}
    />
  );
}

export function useBatchCreateLicenseCardsAction(client: Client) {
  const modalStack = useModalsContext();
  const { t } = useTranslation();

  const createLicenseCards = useCallback(
    (itemIds: Set<string>) => {
      modalStack.add({
        title: t("licenseCreateLicenseDocuments"),
        content: (
          <ClientContext.Provider value={client}>
            <LicenseDocBatchCreate mnrs={Array.from(itemIds)} />
          </ClientContext.Provider>
        ),
        actions: [{ label: t("okModal"), action: () => {}, type: "primary" }],
      });
    },
    [modalStack, client, t],
  );

  return useCallback(
    (itemIds: Set<string>) => {
      if (itemIds.size === 0) return;
      modalStack.add({
        title: t("licenseCreateLicenseDocuments"),
        content: (
          <>
            <p>{t("licenseCreateLicenseDocumentsConfirmText")}</p>
            <p>
              <strong>{t("licenseSelectedLicenses")}:</strong>{" "}
              {Array.from(itemIds).join(", ")}
            </p>
          </>
        ),
        actions: [
          { label: t("abortModal"), action: () => {}, type: "secondary" },
          {
            label: t("licenseCreateLicenseDocuments"),
            action: () => createLicenseCards(itemIds),
            type: "primary",
          },
        ],
      });
    },
    [modalStack, createLicenseCards, t],
  );
}

function DownloadModal<T>({
  downloadFunc,
  filename,
  params,
  loadingMessage,
  successMessage,
}: {
  downloadFunc: (params: [Client, T]) => Promise<Blob>;
  filename: string;
  params: T;
  loadingMessage: string;
  successMessage: string;
}) {
  const client = useClient();

  const downloadExec = useCallback(
    async ([c, filename, p]: [Client, string, T]) => {
      const blob = await downloadFunc([c, p]);
      downloadData(blob, filename);
    },
    [downloadFunc],
  );

  const { isLoading, error } = useSWRImmutable(
    [client, filename, params],
    downloadExec,
  );

  return (
    <>
      {isLoading ? (
        <Alert type="info">
          <Spinner />
          <span className="ms-3">{loadingMessage}</span>
        </Alert>
      ) : error ? (
        <Alert type="danger">
          {error instanceof Error ? error.message : String(error)}
        </Alert>
      ) : (
        <Alert type="success">{successMessage}</Alert>
      )}
    </>
  );
}

export function useDownloadLicenseCardsZipAction(client: Client) {
  const modalStack = useModalsContext();
  const { t } = useTranslation();

  return useCallback(
    (itemIds: Set<string>) => {
      const mnrs = Array.from(itemIds);
      if (mnrs.length === 0) return;

      modalStack.add({
        title: t("licenseDownloadLicenses"),
        content: (
          <ClientContext.Provider value={client}>
            <p>{t("licenseDownloadLicensesText")}:</p>
            <ul>
              {mnrs.map((mnr) => (
                <li key={mnr}>{mnr}</li>
              ))}
            </ul>
            <DownloadModal
              filename="license-cards.zip"
              downloadFunc={fetchLicenseCardsZip}
              params={mnrs}
              loadingMessage={t("licenseLicenseDownloadLoading")}
              successMessage={t("licenseLicenseDownloadSucceeded")}
            />
          </ClientContext.Provider>
        ),
        actions: [
          { label: t("closeModal"), action: () => {}, type: "primary" },
        ],
      });
    },
    [modalStack, client, t],
  );
}
