"use client";

import { Suspense } from "react";
import { useTranslation } from "../../internationalization";
import { useFlags } from "../../contexts";
import { notFound } from "next/navigation";
import { useNotImplementedModal } from "../../hooks";
import {
  LicenseEntryForm,
  LicenseFormData,
} from "@/components/LiceneseEntryForm";

function ActorViewBase() {
  const { t } = useTranslation();
  const notImplementedAction = useNotImplementedModal();
  const flags = useFlags();

  if (!flags.has("mock-license-editing")) {
    notFound();
  }

  const license: Partial<LicenseFormData> = {};

  return (
    <div className="container">
      <div className="row">
        <h2 className="fw-bold">{t("licenseCreate")}</h2>
        <LicenseEntryForm
          initialLicense={license}
          onSubmit={(a) => {
            notImplementedAction(t("actorFormTitle"));
            console.log(a);
          }}
        />
      </div>
    </div>
  );
}

export default function ActorView() {
  return (
    <Suspense>
      <ActorViewBase />
    </Suspense>
  );
}
