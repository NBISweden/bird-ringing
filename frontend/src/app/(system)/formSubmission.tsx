"use client";

import { ReactNode } from "react";
import { useModalsContext } from "./contexts";
import { useTranslation } from "./internationalization";
import { useFormSubmission } from "./hooks";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunc = (...args: any[]) => any | Promise<any>;

// Submits a form and reports the outcome through modal dialogs.
export function useModalFormSubmission<T extends AnyFunc>(
  submitAction: T,
  options: {
    successTitle: string;
    successMessage: ReactNode;
    errorTitle: string;
    onSuccess?: (result: Awaited<ReturnType<T>>) => void | Promise<void>;
    onSuccessConfirm?: (result: Awaited<ReturnType<T>>) => void;
    onSuccessDismiss?: (result: Awaited<ReturnType<T>>) => void;
  },
) {
  const modals = useModalsContext();
  const { t } = useTranslation();

  return useFormSubmission(
    submitAction,
    async (response) => {
      const result = (await response) as Awaited<ReturnType<T>>;
      if (options.onSuccess) {
        await options.onSuccess(result);
      }
      const confirmAction = options.onSuccessConfirm
        ? () => options.onSuccessConfirm!(result)
        : () => {};
      const dismissAction = options.onSuccessDismiss
        ? () => options.onSuccessDismiss!(result)
        : undefined;
      modals.add({
        title: options.successTitle,
        content: options.successMessage,
        closeAction: dismissAction,
        actions: [
          {
            label: t("closeModal"),
            action: confirmAction,
          },
        ],
      });
    },
    (errors) => {
      const lines = errors.nonField;
      if (lines.length === 0) {
        return;
      }
      modals.add({
        title: options.errorTitle,
        content:
          lines.length > 1 ? (
            <ul className="mb-0">
              {lines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="mb-0">{lines[0]}</p>
          ),
        actions: [
          {
            label: t("closeModal"),
            action: () => {},
          },
        ],
      });
    },
  );
}
