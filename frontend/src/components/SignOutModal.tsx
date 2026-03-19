"use client";

import { useCallback } from "react";
import { useModalsContext, useAuth } from "@/app/(system)/contexts";
import { useTranslation } from "@/app/(system)/internationalization";
import { useActionWithoutCache } from "@/app/(system)/hooks";
import Spinner from "@/components/Spinner";
import { Alert } from "@/components/Alert";

function SignOutModal() {
  const auth = useAuth();
  const { t } = useTranslation();
  const { isLoading, error } = useActionWithoutCache("signout", async () => {
    if (auth.signOut) await auth.signOut();
  });

  return isLoading ? (
    <>
      <Spinner />
      <span className="ms-3">{t("userSigningOut")}</span>
    </>
  ) : error ? (
    <Alert type="danger">{String(error)}</Alert>
  ) : (
    <p>{t("userSignedOut")}</p>
  );
}

export function useSignOutAction() {
  const modals = useModalsContext();
  const { t } = useTranslation();

  const closeAction = () => {
    window.location.reload(); // Reload page after signout
  };

  const signOutAction = useCallback(() => {
    modals.add({
      title: t("userSigningOut"),
      content: <SignOutModal />,
      closeAction: closeAction,
      actions: [
        {
          label: t("okModal"),
          action: closeAction,
          type: "success",
        },
      ],
    });
  }, [modals, t]);

  return signOutAction;
}
