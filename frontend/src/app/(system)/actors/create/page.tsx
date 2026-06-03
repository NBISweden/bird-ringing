"use client";

import { Suspense, useState } from "react";
import { ActorBase } from "../../common";
import { useTranslation } from "../../internationalization";
import {
  ActorEntryForm,
  ActorEntryFormErrors,
} from "@/components/ActorEntryForm";
import { useClient, useModalsContext } from "../../contexts";
import { useRouter } from "next/navigation";
import { FieldValidationError } from "../../client";

function ActorViewBase() {
  const { t } = useTranslation();
  const client = useClient();
  const modals = useModalsContext();
  const router = useRouter();
  const [errors, setErrors] = useState<ActorEntryFormErrors | undefined>(
    undefined,
  );

  const handleSubmit = async (actor: Partial<ActorBase>) => {
    setErrors(undefined);
    try {
      const result = await client.createActor(actor);
      modals.add({
        title: t("actorCreateSuccessTitle"),
        content: <p className="mb-0">{t("actorCreateSuccessMessage")}</p>,
        actions: [
          {
            label: t("closeModal"),
            action: () => router.push(`/actors/entry?entryId=${result.id}`),
          },
        ],
      });
    } catch (error) {
      if (error instanceof FieldValidationError) {
        setErrors({
          fields: error.fieldErrors,
          nonField: error.nonFieldErrors,
        });
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      const lines = message.split("\n").filter(Boolean);

      modals.add({
        title: t("actorCreateErrorTitle"),
        content:
          lines.length > 1 ? (
            <ul className="mb-0">
              {lines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="mb-0">{message}</p>
          ),
        actions: [{ label: t("closeModal"), action: () => {} }],
      });
    }
  };
  return (
    <div className="container">
      <div className="row">
        <ActorEntryForm
          initialActor={{}}
          onSubmit={handleSubmit}
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
