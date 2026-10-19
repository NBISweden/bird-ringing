"use client";

import { Suspense } from "react";
import { ActorBase } from "../../common";
import { useTranslation } from "../../internationalization";
import { ActorEntryForm } from "@/components/ActorEntryForm";
import { useClient } from "../../contexts";
import { useRouter } from "next/navigation";
import { useModalFormSubmission } from "../../formSubmission";

function ActorViewBase() {
  const { t } = useTranslation();
  const client = useClient();
  const router = useRouter();

  const { submit, errors } = useModalFormSubmission(
    (actor: Partial<ActorBase>) => client.createActor(actor),
    {
      successTitle: t("actorCreateSuccessTitle"),
      successMessage: <p className="mb-0">{t("actorCreateSuccessMessage")}</p>,
      errorTitle: t("actorCreateErrorTitle"),
      onSuccessConfirm: (result) =>
        router.push(`/actors/entry?entryId=${result.id}`),
    },
  );

  return (
    <div className="container">
      <div className="row">
        <ActorEntryForm
          initialActor={{}}
          onSubmit={submit}
          title={t("actorFormAddTitle")}
          errors={errors}
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
