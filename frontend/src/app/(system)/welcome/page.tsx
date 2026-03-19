"use client";

import { useAuth } from "../contexts";
import { useTranslation } from "../internationalization";
import BuildInfo from "@/components/BuildInfo";
import { useSignOutAction } from "@/components/SignOutModal";

export default function WelcomePage() {
  const user = useAuth();
  const { t } = useTranslation();

  const signOut = useSignOutAction();

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
        <button type="button" className="btn btn-primary" onClick={signOut}>
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
