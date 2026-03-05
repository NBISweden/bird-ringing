import { useCallback } from "react";
import { ClientContext, useClient, useModalsContext } from "../contexts";
import { Client } from "../client";
import Spinner from "@/components/Spinner";
import { SendLicenseModalContent, SendLicenseForActorsModalContent } from "@/components/SendLicenseModalContent";
import { Alert } from "@/components/Alert";
import { downloadData } from "../utils";
import useSWRImmutable from "swr/immutable";
import { useTranslation } from "../internationalization";

type BatchCreateResponse = { filenames: string[] };

type BatchCreateFn = (
  client: Client,
  mnrs: string[],
) => Promise<BatchCreateResponse>;
type DownloadZipFn = (client: Client, mnrs: string[]) => Promise<Blob>;

type SelectedActor = { id: number; name: string };

function GenericBatchCreateBody({
  mnrs,
  createFn,
  loadingText,
}: {
  mnrs: string[];
  createFn: BatchCreateFn;
  loadingText: string;
}) {
  const client = useClient();

  const { data, isLoading, error } = useSWRImmutable(
    [client, mnrs],
    async () => {
      return createFn(client, mnrs);
    },
  );

  return isLoading ? (
    <>
      <Spinner />
      <span className="ms-3">{loadingText}</span>
    </>
  ) : error ? (
    <Alert type="danger">
      {error instanceof Error ? error.message : String(error)}
    </Alert>
  ) : (
    <textarea
      className="form-control"
      rows={8}
      readOnly
      value={data?.filenames.join("\n")}
    />
  );
}

function useBatchCreateAction({
  client,
  title,
  confirmText,
  selectedLabel,
  loadingText,
  createFn,
}: {
  client: Client;
  title: string;
  confirmText: string;
  selectedLabel: string;
  loadingText: string;
  createFn: BatchCreateFn;
}) {
  const modalStack = useModalsContext();
  const { t } = useTranslation();

  const runCreate = useCallback(
    (itemIds: Set<string>) => {
      modalStack.add({
        title,
        content: (
          <ClientContext.Provider value={client}>
            <GenericBatchCreateBody
              mnrs={Array.from(itemIds)}
              createFn={createFn}
              loadingText={loadingText}
            />
          </ClientContext.Provider>
        ),
        actions: [{ label: t("okModal"), action: () => {}, type: "primary" }],
      });
    },
    [modalStack, client, title, createFn, loadingText, t],
  );

  return useCallback(
    (itemIds: Set<string>) => {
      if (itemIds.size === 0) return;
      modalStack.add({
        title,
        content: (
          <>
            <p>{confirmText}</p>
            <p>
              <strong>{selectedLabel}:</strong> {Array.from(itemIds).join(", ")}
            </p>
          </>
        ),
        actions: [
          { label: t("abortModal"), action: () => {}, type: "outline-primary" },
          {
            label: t("licenseCreateLicenseDocuments"),
            action: () => runCreate(itemIds),
            type: "primary",
          },
        ],
      });
    },
    [modalStack, runCreate, title, confirmText, selectedLabel, t],
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

function useDownloadZipAction({
  client,
  title,
  introText,
  filename,
  loadingMessage,
  successMessage,
  downloadFn,
}: {
  client: Client;
  title: string;
  introText: string;
  filename: string;
  loadingMessage: string;
  successMessage: string;
  downloadFn: DownloadZipFn;
}) {
  const modalStack = useModalsContext();
  const { t } = useTranslation();

  // adapter to match DownloadModal signature
  const downloadFunc = useCallback(
    async ([c, mnrs]: [Client, string[]]) => downloadFn(c, mnrs),
    [downloadFn],
  );

  return useCallback(
    (itemIds: Set<string>) => {
      const mnrs = Array.from(itemIds);
      if (mnrs.length === 0) return;

      modalStack.add({
        title,
        content: (
          <ClientContext.Provider value={client}>
            <p>{introText}:</p>
            <ul>
              {mnrs.map((mnr) => (
                <li key={mnr}>{mnr}</li>
              ))}
            </ul>
            <DownloadModal
              filename={filename}
              downloadFunc={downloadFunc}
              params={mnrs}
              loadingMessage={loadingMessage}
              successMessage={successMessage}
            />
          </ClientContext.Provider>
        ),
        actions: [
          { label: t("closeModal"), action: () => {}, type: "primary" },
        ],
      });
    },
    [
      modalStack,
      client,
      title,
      introText,
      filename,
      loadingMessage,
      successMessage,
      downloadFunc,
      t,
    ],
  );
}

async function batchCreateLicenseDocs(
  client: Client,
  mnrs: string[],
): Promise<BatchCreateResponse> {
  return await client.batchCreateLicenseCards(mnrs);
}

async function downloadLicenseCardsZip(
  client: Client,
  mnrs: string[],
): Promise<Blob> {
  return await client.fetchLicenseCardsZipBlob(mnrs);
}

async function batchCreatePermitDocs(
  client: Client,
  mnrs: string[],
): Promise<BatchCreateResponse> {
  return await client.batchCreatePermits(mnrs);
}

async function downloadPermitsZip(
  client: Client,
  mnrs: string[],
): Promise<Blob> {
  return await client.fetchPermitsZipBlob(mnrs);
}

export function useBatchCreateLicenseCardsAction(client: Client) {
  const { t } = useTranslation();

  return useBatchCreateAction({
    client,
    title: t("licenseCreateLicenseDocuments"),
    confirmText: t("licenseCreateLicenseDocumentsConfirmText"),
    selectedLabel: t("licenseSelectedLicenses"),
    loadingText: t("licenseCreatingLicenseDocuments"),
    createFn: batchCreateLicenseDocs,
  });
}

export function useDownloadLicenseCardsZipAction(client: Client) {
  const { t } = useTranslation();

  return useDownloadZipAction({
    client,
    title: t("licenseDownloadLicenses"),
    introText: t("licenseDownloadLicensesText"),
    filename: "license-cards.zip",
    loadingMessage: t("licenseLicenseDownloadLoading"),
    successMessage: t("licenseLicenseDownloadSucceeded"),
    downloadFn: downloadLicenseCardsZip,
  });
}

export function useBatchCreatePermitsAction(client: Client) {
  const { t } = useTranslation();

  return useBatchCreateAction({
    client,
    title: t("permitCreateDocuments"),
    confirmText: t("permitCreateDocumentsConfirmText"),
    selectedLabel: t("licenseSelectedLicenses"),
    loadingText: t("permitCreatingDocuments"),
    createFn: batchCreatePermitDocs,
  });
}

export function useDownloadPermitsZipAction(client: Client) {
  const { t } = useTranslation();

  return useDownloadZipAction({
    client,
    title: t("permitDownloadZip"),
    introText: t("permitDownloadZipText"),
    filename: "permits.zip",
    loadingMessage: t("permitDownloadLoading"),
    successMessage: t("permitDownloadSucceeded"),
    downloadFn: downloadPermitsZip,
  });
}

export function useSendLicenseEmailAction(client: Client) {
  const modalStack = useModalsContext();
  const { t } = useTranslation();

  const sendEmails = useCallback(
    (itemIds: Set<string>) => {
      modalStack.add({
        title: t("licenseSendLicenses"),
        content: (
          <ClientContext.Provider value={client}>
            <SendLicenseModalContent mnrs={Array.from(itemIds)} />
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
        title: t("licenseSendLicenses"),
        content: (
          <>
            <p>{t("licenseSendLicensesConfirmText")}</p>
            <p>
              <strong>{t("licenseSelectedLicenses")}:</strong>{" "}
              {Array.from(itemIds).join(", ")}
            </p>
          </>
        ),
        actions: [
          { label: t("abortModal"), action: () => {}, type: "outline-primary" },
          {
            label: t("licenseSendLicenses"),
            action: () => sendEmails(itemIds),
            type: "primary",
          },
        ],
      });
    },
    [modalStack, t, sendEmails],
  );
}

export function useSendLicenseEmailForActorsAction(client: Client) {
  const modalStack = useModalsContext();
  const { t } = useTranslation();

  const sendEmails = useCallback(
    (mnr: string, actors: SelectedActor[], notifyRinger?: boolean) => {
      modalStack.add({
        title: t("licenseSendLicenses"),
        content: (
          <ClientContext.Provider value={client}>
            <SendLicenseForActorsModalContent
              mnr={mnr}
              actorIds={actors.map((a) => a.id)}
              notifyRinger={notifyRinger}
              actorNames={Object.fromEntries(actors.map((a) => [a.id, a.name]))}
            />
          </ClientContext.Provider>
        ),
        actions: [{ label: t("okModal"), action: () => {}, type: "primary" }],
      });
    },
    [modalStack, client, t],
  );

  return useCallback(
    (mnr: string, actors: SelectedActor[], notifyRinger?: boolean) => {
      if (actors.length === 0) {
        modalStack.add({
          title: t("licenseSendLicenses"),
          content: <p>{t("licenseNoActorsSelected")}</p>,
          actions: [{ label: t("okModal"), action: () => {}, type: "primary" }],
        });
        return;
      }

      modalStack.add({
        title: t("licenseSendLicenses"),
        content: (
          <>
            <p>{t("licenseSendLicensesSelectedActorsConfirmText")}</p>
            <p>
              <strong>{t("licenseSelectedActors")}:</strong>{" "}
              {actors.map((a) => a.name).join(", ")}
            </p>
          </>
        ),
        actions: [
          { label: t("abortModal"), action: () => {}, type: "outline-primary" },
          {
            label: t("licenseSendLicenses"),
            action: () => sendEmails(mnr, actors, notifyRinger),
            type: "primary",
          },
        ],
      });
    },
    [modalStack, t, sendEmails],
  );
}