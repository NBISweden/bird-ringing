"use client";

import { Suspense } from "react";
import { useTranslation } from "../../internationalization";
import { useFormSubmission } from "../../hooks";
import {
  LicenseEntryForm,
  LicenseFormData,
} from "@/components/LiceneseEntryForm";
import { AlertModal, useClient, useModalsContext } from "../../contexts";
import { FieldErrors } from "@/components/InputFields";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/Alert";

function LicenseViewBase() {
  const { t } = useTranslation();
  const client = useClient();
  const router = useRouter();
  const modals = useModalsContext();

  const license: Partial<LicenseFormData> = {
    mnr: "",
    status: "",
    starts_at: "",
    ends_at: "",
    location: "",
    description: "",
    report_status: "",
  };

  const { submit, isSubmitting, errors } = useFormSubmission(
    (license: LicenseFormData) => client.createLicense(license),
    async (response) => {
      const result = await response;
      modals.add(
        AlertModal(
          t("licenseCreateSuccessTitle"),
          <p className="mb-0">{t("licenseCreateSuccessMessage")}</p>,
          t("closeModal"),
          () => router.push(`/licenses/entry?mnr=${result.mnr}`),
        ),
      );
    },
    async (errors) => {
      const lines = errors.nonField;

      if (lines.length > 0) {
        modals.add(
          AlertModal(
            t("licenseCreateErrorTitle"),
            lines.length > 1 ? (
              <ul className="mb-0">
                {lines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="mb-0">{lines[0]}</p>
            ),
            t("closeModal"),
          ),
        );
      }
    },
  );

  return (
    <div className="container">
      <div className="row ">
        <div className="col-12 col-xl-10 col-xxl-9">
          <div className="card">
            <div className="card-header">
              <h3 className="m-0">{t("licenseFormAddTitle")}</h3>
            </div>
            <div className="card-body">
              {errors && errors.nonField.length > 0 ? (
                <div tabIndex={-1}>
                  <Alert type="danger">
                    {errors.nonField.length === 1 ? (
                      <p className="mb-0">{errors.nonField[0]}</p>
                    ) : (
                      <ul className="mb-0">
                        {errors.nonField.map((message, i) => (
                          <li key={i}>{message}</li>
                        ))}
                      </ul>
                    )}
                  </Alert>
                </div>
              ) : null}
              <FieldErrors errors={errors?.fields || {}}>
                <LicenseEntryForm
                  initialLicense={license}
                  isSubmitting={isSubmitting}
                  onSubmit={submit}
                />
              </FieldErrors>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LicenseView() {
  return (
    <Suspense>
      <LicenseViewBase />
    </Suspense>
  );
}
