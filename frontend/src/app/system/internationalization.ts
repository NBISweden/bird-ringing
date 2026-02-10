import { useMemo } from "react";
import { PrimitiveType, useIntl } from "react-intl";
import { TranslationMap, messages } from "../messages";
import type { FormatXMLElementFn } from "intl-messageformat";

export type Translation = {
  t: (
    messageId: keyof TranslationMap,
    values?: Record<string, PrimitiveType>,
  ) => string;
  format: (
    messageId: keyof TranslationMap,
    values?: Record<
      string,
      | React.ReactNode
      | PrimitiveType
      | FormatXMLElementFn<string, React.ReactNode>
    >,
  ) => Array<React.ReactNode>;
};

export function useTranslation() {
  const intl = useIntl();

  const translation = useMemo<Translation>(() => {
    return {
      t: (messageId, values?) => {
        return intl.formatMessage(messages[messageId], values);
      },
      format: (messageId, values?) => {
        return intl.formatMessage(messages[messageId], values);
      },
    };
  }, [intl]);
  return translation;
}
