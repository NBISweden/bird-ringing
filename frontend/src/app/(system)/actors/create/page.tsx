"use client";

import { Suspense } from "react";
import { ActorBase } from "../../common";
import { useTranslation } from "../../internationalization";
import { ActorEntryForm } from "@/components/ActorEntryForm";
import { useFlags, useClient, useModalsContext } from "../../contexts";
import { notFound } from "next/navigation";
import { useNotImplementedModal } from "../../hooks";

function ActorViewBase() {
  const { t } = useTranslation();
  const notImplementedAction = useNotImplementedModal();
  const flags = useFlags();
  const client = useClient();
  const modals = useModalsContext();

  if (!flags.has("mock-actor-editing")) {
    notFound();
  }

  const handleSubmit = async (actor: Partial<ActorBase>) => {
    console.log("starting save process");
    try {
      await client.createActor(actor);

      modals.add({
        title: t("actorFormCreateSuccessTitle"),
        content: <p className="mb-0">{t("actorFormCreateSuccessMessage")}</p>,
        actions: [{ label: t("closeModal"), action: () => {} }],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const lines = message.split("\n").filter(Boolean);

      modals.add({
        title: t("actorFormCreateErrorTitle"),
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
          onSubmit={(a) => {
            handleSubmit;
            console.log(a);
          }}
          title={t("actorFormAddTitle")}
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
