import { useState } from "react";
import { useTranslation } from "../app/system/internationalization";
import { Client } from "./../app/system/client";
import { SendEmailResult } from "@/app/system/common";
import Spinner from "./Spinner";

type Status = "idle" | "confirm" | "loading" | "success" | "error";

interface SendLicenseModalContentProps {
  client: Client;
  mnrs: string[];
}

export function SendLicenseModalContent({
  client,
  mnrs,
}: SendLicenseModalContentProps) {
  const [includeCard, setIncludeCard] = useState(false);
  const [includePermit, setIncludePermit] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<SendEmailResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  const sendEmails = async () => {
    setStatus("loading");
    setError(null);

    try {
      const response = await client.batchSendLicenseEmails(
        mnrs,
        includeCard,
        includePermit,
      );
      setResult(response);
      setStatus("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("unknownError"));
      setStatus("error");
    }
  };

  const handleSend = () => {
    if (!includeCard && !includePermit) {
      setStatus("confirm");
    } else {
      sendEmails();
    }
  };

  if (status === "confirm") {
    return (
      <>
        <div className="alert alert-warning" role="alert">
          {t("licenseSendLicensesNoAttachmentsWarning")}
        </div>
        <div className="d-flex justify-content-end gap-2">
          <button
            className="btn btn-secondary"
            onClick={() => setStatus("idle")}
          >
            {t("backModal")}
          </button>
          <button className="btn btn-primary" onClick={sendEmails}>
            {t("continueModal")}
          </button>
        </div>
      </>
    );
  }

  if (status === "loading") {
    return (
      <>
        <Spinner />
        <span className="ms-3">{t("licenseSendingLicenses")}</span>
      </>
    );
  }

  if (status === "error") {
    return (
      <>
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
        <button className="btn btn-secondary" onClick={() => setStatus("idle")}>
          {t("backModal")}
        </button>
      </>
    );
  }

  if (status === "success" && result) {
    return (
      <>
        <div className="alert alert-success">
          {t("licenseSendLicensesSucceeded", {
            sent: result.messages_sent,
          })}
        </div>

        {result.failed_messages.length > 0 && (
          <div className="alert alert-warning">
            <p>{t("licenseSendLicensesFailed")}:</p>
            <ul>
              {result.failed_messages.map((msg, idx) => (
                <li key={idx}>{msg}</li>
              ))}
            </ul>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <p>
        <strong>{t("licenseSelectedLicenses")}:</strong> {mnrs.join(", ")}
      </p>
      <p>
        <strong>{t("licenseSendLicensesOptionsText")}</strong>
      </p>

      <div className="form-check mb-2">
        <input
          type="checkbox"
          className="form-check-input"
          id="includeCard"
          checked={includeCard}
          onChange={(e) => setIncludeCard(e.target.checked)}
        />
        <label className="form-check-label" htmlFor="includeCard">
          {t("licenseIncludeLicenseCard")}
        </label>
      </div>

      <div className="form-check mb-3">
        <input
          type="checkbox"
          className="form-check-input"
          id="includePermit"
          checked={includePermit}
          onChange={(e) => setIncludePermit(e.target.checked)}
          disabled
        />
        <label className="form-check-label" htmlFor="includePermit">
          {t("licenseIncludePermit")}
        </label>
      </div>

      <div className="d-flex justify-content-end">
        <button className="btn btn-primary" onClick={handleSend}>
          {t("licenseSendLicenses")}
        </button>
      </div>
    </>
  );
}
