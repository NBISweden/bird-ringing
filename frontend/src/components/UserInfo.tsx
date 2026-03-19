"use client";
import { AuthContext } from "@/app/system/contexts";
import { useTranslation } from "@/app/system/internationalization";
import { useContext, useState } from "react";
import { useSignOutAction } from "./SignOutModal";
import { DropDownMenu } from "./DropDownMenu";

export default function UserInfo() {
  const auth = useContext(AuthContext);
  const [actionIsOpen, setActionIsOpen] = useState(false);
  const { t } = useTranslation();
  const signOut = useSignOutAction();
  return auth && auth.isAuthenticated ? (
    <div className="position-relative">
      <button
        className={`btn btn-outline-light user-info`}
        onClick={() => setActionIsOpen(!actionIsOpen)}
        type="button"
        aria-expanded={actionIsOpen}
      >
        <i className="bi bi-person-fill me-3" />
        {auth.username}
      </button>
      <DropDownMenu
        isOpen={actionIsOpen}
        setIsOpen={setActionIsOpen}
        actions={[
          {
            label: t("userSignOut"),
            action: () => signOut(),
          },
        ]}
      />
    </div>
  ) : (
    <></>
  );
}
