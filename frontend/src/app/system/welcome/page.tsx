"use client";

import { useCallback } from "react";
import { useModalsContext, useAuth } from "../contexts";
import { useTranslation } from "../internationalization";
import BuildInfo from "@/components/BuildInfo";
import { useActionWithoutCache } from "../hooks";
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

export default function WelcomePage() {
  const user = useAuth();
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

  return (
    <div className="container">
      <div
        className="d-flex flex-column gap-2 mb-3"
        style={{ textAlign: "left" }}
      >
        <h1>{t("userWelcomeHeader", { name: user.username })} 🐦</h1>
        <p>{t("userWelcomeText")}</p>
      </div>
      <div className="d-flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          className="btn btn-primary"
          onClick={signOutAction}
        >
          {t("userSignOut")}
        </button>
      </div>
      <h2>{t("userPermissions")}</h2>
      <div className="table-responsive">
        <table className="table table-striped table-bordered align-middle">
          <thead className="table-success">
            <tr>
              <th scope="col">Permission</th>
            </tr>
          </thead>
          <tbody>
            {user.permissions.map((p) => (
              <tr key={p}>
                <td>{p}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <hr />
      <BuildInfo />
    </div>
  );
}
