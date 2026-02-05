import { useMemo } from "react";
import { PrimitiveType, useIntl } from "react-intl";
import { TranslationMap, messages } from "../messages";

export type Translation = {
  t: (
    messageId: keyof TranslationMap,
    values?: Record<string, PrimitiveType>,
  ) => string;
};

export function useTranslation() {
  const intl = useIntl();

  const translation = useMemo<Translation>(() => {
    return {
      t: (messageId, values?) => {
        return intl.formatMessage(messages[messageId], values);
      },
    };
  }, [intl]);
  return translation;
}
