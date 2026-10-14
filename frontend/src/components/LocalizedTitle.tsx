"use client";
import {
  TranslationId,
  useTranslation,
} from "@/app/(system)/internationalization";
import { useEffect } from "react";
import { PrimitiveType } from "react-intl";

type LocalizedTitleProps = {
  messageId: TranslationId;
  values?: Record<string, PrimitiveType>;
};

export function LocalizedTitle({ messageId, values }: LocalizedTitleProps) {
  const { t } = useTranslation();
  const title = t(messageId, values);

  useEffect(() => {
    document.title = title;
  }, [title]);

  return <></>;
}
