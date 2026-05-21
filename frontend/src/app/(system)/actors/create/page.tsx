"use client";

import { Suspense } from "react";
import { ActorBase } from "../../common";
import { useTranslation } from "../../internationalization";
import { ActorEntryForm } from "@/components/ActorEntryForm";
import { useFlags } from "../../contexts";
import { notFound } from "next/navigation";
import { useNotImplementedModal } from "../../hooks";

function ActorViewBase() {
  const { t } = useTranslation();
  const notImplementedAction = useNotImplementedModal();
  const flags = useFlags();

  if (!flags.has("mock-actor-editing")) {
    notFound();
  }

  const actor: Partial<ActorBase> = {};

  return (
    <div className="container">
      <div className="row">
        <ActorEntryForm
          initialActor={actor}
          onSubmit={(a) => {
            notImplementedAction(t("actorFormAddTitle"));
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
