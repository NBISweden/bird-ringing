"use client";

import { Suspense, useState } from "react";
import { ActorBase } from "../../common";
import { useTranslation } from "../../internationalization";
import { ActorEntryForm } from "@/components/ActorEntryForm";
import { useFlags, useClient, useModalsContext } from "../../contexts";
import { notFound, useRouter } from "next/navigation";

function ActorViewBase() {
  const { t } = useTranslation();
  const flags = useFlags();
  const client = useClient();
  const modals = useModalsContext();
  const router = useRouter();
  const [savedActorId, setSavedActorId] = useState<number | null>(null);

  if (!flags.has("mock-actor-editing")) {
    notFound();
  }

  const handleSubmit = async (actor: Partial<ActorBase>) => {
    console.log("starting save process");
    try {
      const result =
        savedActorId !== null
          ? await client.updateActor(savedActorId, actor)
          : await client.createActor(actor);

      if (savedActorId === null) {
        setSavedActorId(result.id);
      }
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
          onSubmit={(a) => {
            handleSubmit(a);
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
