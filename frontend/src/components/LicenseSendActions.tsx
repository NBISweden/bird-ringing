"use client";

import { useTranslation } from "@/app/(system)/internationalization";

type LicenseSendActionsProps = {
  disabled: boolean;
  notifyRinger: boolean;
  canNotifyRinger: boolean;
  onNotifyRingerChange: (notifyRinger: boolean) => void;
  allSelected: boolean;
  onToggleAll: () => void;
  onSend: () => void;
};

export function LicenseSendActions({
  disabled,
  notifyRinger,
  canNotifyRinger,
  onNotifyRingerChange,
  allSelected,
  onToggleAll,
  onSend,
}: LicenseSendActionsProps) {
  const { t } = useTranslation();

  return (
    <>
      {disabled && (
        <span className="small text-muted fst-italic">
          {t("licenseSendDisabledInactive")}
        </span>
      )}
      <div className="form-check m-0">
        <input
          className="form-check-input border border-dark"
          type="checkbox"
          checked={notifyRinger}
          disabled={!canNotifyRinger || disabled}
          onChange={(e) => onNotifyRingerChange(e.target.checked)}
          id="notify-ringer"
        />
        <label
          className="form-check-label small text-muted"
          htmlFor="notify-ringer"
          title={t("licenseNotifyRingerHelp")}
        >
          {t("licenseNotifyRinger")}
        </label>
      </div>
      <div className="form-check m-0">
        <input
          className="form-check-input border border-dark"
          type="checkbox"
          checked={allSelected}
          disabled={disabled}
          onChange={onToggleAll}
          id="select-all"
        />
        <label
          className="form-check-label small text-muted"
          htmlFor="select-all"
          title={t("licenseSelectAllActors")}
        >
          {t("licenseSelectAllActors")}
        </label>
      </div>
      <button
        className="btn btn-secondary flex-grow-0"
        disabled={disabled}
        title={disabled ? t("licenseSendDisabledInactive") : undefined}
        onClick={onSend}
      >
        {t("licenseSendLicenses")}
      </button>
    </>
  );
}
