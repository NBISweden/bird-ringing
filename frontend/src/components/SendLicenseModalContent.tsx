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

function SendEmailResultDetails({
  data,
  actorNames,
  showRingerBundleMessagesSent,
  showSkippedMessagesList,
}: {
  data: SendEmailResult | undefined;
  actorNames?: Record<number, string>;
  showRingerBundleMessagesSent?: boolean;
  showSkippedMessagesList?: boolean;
}) {
  const { t } = useTranslation();

  if (!data) return <></>;
  showRingerBundleMessagesSent =
    showRingerBundleMessagesSent === undefined
      ? true
      : showRingerBundleMessagesSent;
  showSkippedMessagesList =
    showSkippedMessagesList === undefined ? true : showSkippedMessagesList;

  return (
    <>
      {showRingerBundleMessagesSent &&
        typeof data.ringer_bundle_messages_sent === "number" && (
          <div className="alert alert-info">
            {t("licenseRingerBundleMessagesSent", {
              count: data.ringer_bundle_messages_sent,
            })}
          </div>
        )}

      {data.ringer_bundle_message && (
        <div className="alert alert-info">
          {data.ringer_bundle_message === "sent"
            ? t("licenseRingerBundleMessageSent")
            : data.ringer_bundle_message}
        </div>
      )}

      {data.ringer_bundle_error && (
        <div className="alert alert-warning">
          {t("licenseRingerBundleError", { error: data.ringer_bundle_error })}
        </div>
      )}

      {data.ringer_bundle_failed_messages &&
        data.ringer_bundle_failed_messages.length > 0 && (
          <div className="alert alert-warning">
            <p>{t("licenseRingerBundleFailedMessages")}:</p>
            <ul>
              {data.ringer_bundle_failed_messages.map((msg, idx) => (
                <li key={idx}>
                  {t("licenseFailedMessageRow", {
                    to: msg.to.join(", "),
                    details: msg.details,
                  })}
                </li>
              ))}
            </ul>
          </div>
        )}

      {data.failed_messages && data.failed_messages.length > 0 && (
        <div className="alert alert-warning">
          <p>{t("licenseFailedMessagesDetails")}:</p>
          <ul>
            {data.failed_messages.map((msg, idx) => (
              <li key={idx}>
                {t("licenseFailedMessageRow", {
                  to: msg.to.join(", "),
                  details: msg.details,
                })}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.skipped_messages && data.skipped_messages.length > 0 && (
        <div className="alert alert-secondary">
          {showSkippedMessagesList ? (
            <>
              <p>{t("licenseSkippedMessages")}:</p>
              <ul>
                {data.skipped_messages.map((msg, idx) => (
                  <li key={idx}>
                    {t("licenseSkippedMessageRow", {
                      mnr: msg.mnr,
                      actor:
                        actorNames && msg.actor_id in actorNames
                          ? actorNames[msg.actor_id]
                          : String(msg.actor_id),
                      reason: msg.reason,
                    })}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              {Object.entries(
                (data.skipped_messages || []).reduce<Record<string, number>>(
                  (acc, msg) => {
                    const reason = msg.reason || "unknown";
                    acc[reason] = (acc[reason] || 0) + 1;
                    return acc;
                  },
                  {},
                ),
              ).map(([reason, count]) => (
                <p key={reason} className="mb-0">
                  {t("licenseSkippedMessagesCountByReason", { reason, count })}
                </p>
              ))}
            </>
          )}
        </div>
      )}
    </>
  );
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

      <SendEmailResultDetails
        data={data}
        showRingerBundleMessagesSent={false}
        showSkippedMessagesList={false}
      />
    </>
  );
}

interface SendLicenseForActorsModalContentProps {
  mnr: string;
  actorIds: number[];
  notifyRinger?: boolean;
  actorNames?: Record<number, string>;
}

export function SendLicenseForActorsModalContent({
  mnr,
  actorIds,
  notifyRinger,
  actorNames,
}: SendLicenseForActorsModalContentProps) {
  const client = useClient();
  const { t } = useTranslation();
  const hasSent = useRef(false);

  const includeCard = true;
  const includePermit = false;

  async function sendEmails(
    key: string,
    {
      arg,
    }: {
      arg: {
        client: Client;
        mnr: string;
        actorIds: number[];
        notifyRinger?: boolean;
      };
    },
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

      <SendEmailResultDetails data={data} actorNames={actorNames} />
    </>
  );
}
