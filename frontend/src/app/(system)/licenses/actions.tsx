import { useCallback } from "react";
import { ClientContext, useClient, useModalsContext } from "../contexts";
import { Client } from "../client";
import Spinner from "@/components/Spinner";
import {
  SendLicenseModalContent,
  SendLicenseForActorsModalContent,
} from "@/components/SendLicenseModalContent";
import { Alert } from "@/components/Alert";
import { downloadData } from "../utils";
import { TranslationId, useTranslation } from "../internationalization";
import { useActionWithoutCache } from "../hooks";

type BatchCreateResponse = {
  filenames: string[];
  inactive_licenses?: string[];
};

type BatchCreateFn = (
  client: Client,
  mnrs: string[],
) => Promise<BatchCreateResponse>;
type DownloadZipFn = (client: Client, mnrs: string[]) => Promise<Blob>;

type SelectedActor = { id: number; name: string };

function GenericBatchCreateBody({
  mnrs,
  createFn,
  loadingMessage,
  resultMessage,
}: {
  mnrs: string[];
  createFn: BatchCreateFn;
  loadingMessage: TranslationId;
  resultMessage: TranslationId;
}) {
  const client = useClient();
  const { t, format } = useTranslation();

  const { data, isLoading, error } = useActionWithoutCache(
    "Batch actions: " + mnrs.join(","),
    async () => {
      return createFn(client, mnrs);
    },
  );

  return isLoading ? (
    <>
      <Spinner />
      <span className="ms-3">{t(loadingMessage)}</span>
    </>
  ) : error ? (
    <Alert type="danger">
      {error instanceof Error ? error.message : String(error)}
    </Alert>
  ) : (
    format(resultMessage, {
      filenames: [],
      inactive_licenses: [],
      ...(data || {}),
      has_inactive_licenses: String((data?.inactive_licenses?.length || 0) > 0),
      h: (chunks: React.ReactNode) => <h2 className="fs-6">{chunks}</h2>,
      list: (chunks) => {
        return (
          <ul>
            {chunks.map((c, index) => (
              <li key={index}>{c}</li>
            ))}
          </ul>
        );
      },
      box: (chunks) => {
        return (
          <textarea
            className="form-control"
            rows={Math.min(8, chunks.length)}
            readOnly
            value={chunks.map((c) => String(c)).join("\n")}
          />
        );
      },
    })
  );
}

function useShowNoSelectionModal() {
  const modalStack = useModalsContext();
  const { t } = useTranslation();

  return useCallback(
    ({ title, message }: { title: string; message: string }) => {
      modalStack.add({
        title,
        content: <Alert type="secondary">{message}</Alert>,
        actions: [
          {
            label: t("okModal"),
            action: () => {},
            type: "primary",
          },
        ],
      });
    },
    [modalStack, t],
  );
}

function useBatchCreateAction({
  client,
  title,
  confirmText,
  selectedLabel,
  loadingMessage,
  createFn,
}: {
  client: Client;
  title: string;
  confirmText: string;
  selectedLabel: string;
  loadingMessage: TranslationId;
  createFn: BatchCreateFn;
}) {
  const modalStack = useModalsContext();
  const { t } = useTranslation();
  const showNoSelectionModal = useShowNoSelectionModal();

  const runCreate = useCallback(
    (itemIds: Set<string>) => {
      modalStack.add({
        title,
        content: (
          <ClientContext.Provider value={client}>
            <GenericBatchCreateBody
              mnrs={Array.from(itemIds)}
              createFn={createFn}
              loadingMessage={loadingMessage}
              resultMessage="standardBatchResponse"
            />
          </ClientContext.Provider>
        ),
        actions: [{ label: t("okModal"), action: () => {}, type: "primary" }],
      });
    },
    [modalStack, client, title, createFn, loadingMessage, t],
  );

  return useCallback(
    (itemIds: Set<string>) => {
      if (itemIds.size === 0) {
        showNoSelectionModal({
          title,
          message: t("licenseNoLicensesSelected"),
        });
        return;
      }

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
          {
            label: t("abortModal"),
            action: () => {},
            type: "outline-primary",
          },
          {
            label: t("buttonCreateDocuments"),
            action: () => runCreate(itemIds),
            type: "primary",
          },
        ],
      });
    },
    [
      modalStack,
      runCreate,
      title,
      confirmText,
      selectedLabel,
      t,
      showNoSelectionModal,
    ],
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

  const { isLoading, error } = useActionWithoutCache(
    "Download: " + filename,
    async () => {
      const blob = await downloadFunc([client, params]);
      downloadData(blob, filename);
    },
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
  const showNoSelectionModal = useShowNoSelectionModal();

  // adapter to match DownloadModal signature
  const downloadFunc = useCallback(
    async ([c, mnrs]: [Client, string[]]) => downloadFn(c, mnrs),
    [downloadFn],
  );

  return useCallback(
    (itemIds: Set<string>) => {
      const mnrs = Array.from(itemIds);
      if (mnrs.length === 0) {
        showNoSelectionModal({
          title,
          message: t("licenseNoLicensesSelected"),
        });
        return;
      }

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
      showNoSelectionModal,
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
    loadingMessage: "licenseCreatingLicenseDocuments",
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
    loadingMessage: "permitCreatingDocuments",
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
  const showNoSelectionModal = useShowNoSelectionModal();

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
      if (itemIds.size === 0) {
        showNoSelectionModal({
          title: t("licenseSendLicenses"),
          message: t("licenseNoLicensesSelected"),
        });
        return;
      }

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
    [modalStack, t, sendEmails, showNoSelectionModal],
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
