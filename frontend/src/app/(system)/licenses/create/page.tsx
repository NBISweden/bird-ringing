"use client";

import { Suspense } from "react";
import { useTranslation } from "../../internationalization";
import { useNotImplementedModal } from "../../hooks";
import {
  LicenseEntryForm,
  LicenseFormData,
} from "@/components/LiceneseEntryForm";

function LicenseViewBase() {
  const { t } = useTranslation();
  const notImplementedAction = useNotImplementedModal();

  const license: Partial<LicenseFormData> = {
    mnr: "",
    status: "active",
    starts_at: "",
    ends_at: "",
    location: "",
    description: "",
    report_status: "no",
  };

  return (
    <div className="container">
      <div className="row">
        <h2 className="fw-bold">{t("licenseCreate")}</h2>
        <LicenseEntryForm
          initialLicense={license}
          onSubmit={(license) => {
            notImplementedAction(t("licenseFormAddTitle"));
            console.log(license);
          }}
        />
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
