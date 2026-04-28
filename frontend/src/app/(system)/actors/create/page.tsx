"use client";

import { Suspense } from "react";
import { ActorBase } from "../../common";
import { useTranslation } from "../../internationalization";
import { ActorEntryForm } from "@/components/ActorEntryForm";
import { useNotImplementedModal } from "../actions";

function ActorViewBase() {
  const { t } = useTranslation();
  const notImplementedAction = useNotImplementedModal();

  const actor: Partial<ActorBase> = {};

  return (
    <div className="container">
      <div className="row">
        <h2 className="fw-bold">
          <i className={`bi bi-person me-3`} />
          {t("actorCreate")}
        </h2>
        <ActorEntryForm
          initialActor={actor}
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
