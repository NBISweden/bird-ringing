import { useCallback } from "react";
import { ClientContext, useClient, useModalsContext } from "../contexts";
import { Client } from "../client";
import Spinner from "@/components/Spinner";
import { Alert } from "@/components/Alert";
import useSWRImmutable from "swr/immutable";
import { useTranslation } from "../internationalization";

export function useFetchEmailAddressesAction(client: Client) {
  const modalStack = useModalsContext();
  const { t } = useTranslation();

  const action = useCallback(
    (itemIds: Set<string>) => {
      modalStack.add({
        title: t("actorFetchEmailAddresses"),
        content: (
          <ClientContext.Provider value={client}>
            <ActorEmailList ids={Array.from(itemIds)} />
          </ClientContext.Provider>
        ),
        actions: [
          {
            label: t("closeModal"),
            action: () => {},
            type: "primary",
          },
        ],
      });
    },
    [modalStack, client, t],
  );
  return action;
}

async function fetchActorEmail([client, ids]: [
  Client,
  string[],
  string,
]): Promise<string[]> {
  const actors = await Client.fetchAll(
    client.fetchActorPage(1, undefined, undefined, ids),
  );
  return actors
    .filter((a) => a.email)
    .map((a) => `${a.full_name} <${a.email}>`);
}

function ActorEmailList({ ids }: { ids: string[] }) {
  const client = useClient();
  const { t } = useTranslation();

  const { data, isLoading, error } = useSWRImmutable(
    [client, ids],
    fetchActorEmail,
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
