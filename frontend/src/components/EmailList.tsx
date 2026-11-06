import { Client } from "@/app/(system)/client";
import { useClient } from "@/app/(system)/contexts";
import { useTranslation } from "@/app/(system)/internationalization";
import useSWRImmutable from "swr/immutable";
import Spinner from "./Spinner";
import { Alert } from "./Alert";

export function EmailList({
  ids,
  dataFetchFunc,
}: {
  ids: string[];
  dataFetchFunc: ([client, ids]: [Client, string[]]) => Promise<string[]>;
}) {
  const client = useClient();
  const { t } = useTranslation();

  const { data, isLoading, error } = useSWRImmutable(
    [client, ids],
    dataFetchFunc,
  );

  return isLoading ? (
    <>
      <Spinner />
      <span className="ms-3">{t("actorLoadingEmailAddresses")}</span>
    </>
  ) : error ? (
    <Alert type="danger">{String(error)}</Alert>
  ) : data && data.length > 0 ? (
    <>{data.join("; ")}</>
  ) : (
    <Alert type="secondary">{t("actorNoEmailAddressesFound")}</Alert>
  );
}
