import { useTranslation } from "../app/system/internationalization";
import { Client } from "./../app/system/client";
import { SendEmailResult } from "@/app/system/common";
import Spinner from "./Spinner";
import { Alert } from "./Alert";
import { useClient } from "@/app/system/contexts";
import { useEffect, useRef } from "react";
import useSWRMutation from "swr/mutation";

interface SendLicenseModalContentProps {
  mnrs: string[];
}

export function SendLicenseModalContent({
  mnrs,
}: SendLicenseModalContentProps) {
  const client = useClient();
  const { t } = useTranslation();
  const hasSent = useRef(false);

  const includeCard = true;
  const includePermit = false;

  async function batchSendEmails(
    key: string,
    { arg }: { arg: { client: Client; mnrs: string[] } },
  ): Promise<SendEmailResult> {
    const response = await arg.client.batchSendLicenseEmails(
      arg.mnrs,
      includeCard,
      includePermit,
    );
    return response;
  }

  const { data, trigger, isMutating, error } = useSWRMutation(
    "send-license-emails",
    batchSendEmails,
  );

  useEffect(() => {
    if (hasSent.current) return;
    hasSent.current = true;
    trigger({ client, mnrs });
  });

  return isMutating ? (
    <>
      <Spinner />
      <span className="ms-3">{t("licenseSendingLicenses")}</span>
    </>
  ) : error ? (
    <Alert type="danger">
      <p>{t("licenseSendLicensesFailed")}</p>
    </Alert>
  ) : (
    <>
      <div className="alert alert-success">
        {t("licenseSendLicensesSucceeded", {
          sent: data?.messages_sent,
        })}
      </div>

      {data && data.failed_messages && data.failed_messages.length > 0 && (
        <div className="alert alert-warning">
          <p>{t("licenseSendLicensesFailed")}:</p>
          <ul>
            {data?.failed_messages.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

interface SendLicenseForActorsModalContentProps {
  mnr: string;
  actorIds: number[];
  notifyRinger?: boolean;
}

export function SendLicenseForActorsModalContent({
  mnr,
  actorIds,
  notifyRinger,
}: SendLicenseForActorsModalContentProps) {
  const client = useClient();
  const { t } = useTranslation();
  const hasSent = useRef(false);

  const includeCard = true;
  const includePermit = false;

  async function sendEmails(
    key: string,
    { arg }: { arg: { client: Client; mnr: string; actorIds: number[]; notifyRinger?: boolean } },
  ): Promise<SendEmailResult> {
    const response = await arg.client.sendLicenseEmailsForActors(
      arg.mnr,
      arg.actorIds,
      includeCard,
      includePermit,
      arg.notifyRinger,
    );
    return response;
  }

  const { data, trigger, isMutating, error } = useSWRMutation(
    "send-license-emails-for-actors",
    sendEmails,
  );

  useEffect(() => {
    if (hasSent.current) return;
    hasSent.current = true;
    trigger({ client, mnr, actorIds, notifyRinger });
  });

  return isMutating ? (
    <>
      <Spinner />
      <span className="ms-3">{t("licenseSendingLicenses")}</span>
    </>
  ) : error ? (
    <Alert type="danger">
      <p>{t("licenseSendLicensesFailed")}</p>
    </Alert>
  ) : (
    <>
      <div className="alert alert-success">
        {t("licenseSendLicensesSucceeded", {
          sent: data?.messages_sent,
        })}
      </div>

      {data && data.failed_messages && data.failed_messages.length > 0 && (
        <div className="alert alert-warning">
          <p>{t("licenseSendLicensesFailed")}:</p>
          <ul>
            {data?.failed_messages.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}