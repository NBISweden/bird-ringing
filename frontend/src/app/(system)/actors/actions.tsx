import { useCallback } from "react";
import { ClientContext, useModalsContext } from "../contexts";
import { Client } from "../client";
import { useTranslation } from "../internationalization";
import { EmailList } from "@/components/EmailList";
import { chunkArray } from "../utils";

export function useFetchEmailAddressesAction(client: Client) {
  const modalStack = useModalsContext();
  const { t } = useTranslation();

  const action = useCallback(
    (itemIds: Set<string>) => {
      modalStack.add({
        title: t("actorFetchEmailAddresses"),
        content: (
          <ClientContext.Provider value={client}>
            <EmailList
              ids={Array.from(itemIds)}
              dataFetchFunc={fetchActorEmail}
            />
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

async function fetchActorEmail([client, ids]: [Client, string[]]): Promise<
  string[]
> {
  const maximumNumberOfIds = 100;
  const idChunks = chunkArray(ids, maximumNumberOfIds);

  const actors = (
    await Promise.all(
      idChunks.map((chunk) =>
        Client.fetchAll(client.fetchActorPage(1, undefined, undefined, chunk)),
      ),
    )
  ).flat();
  return actors
    .filter((a) => a.email)
    .map((a) => `${a.full_name} <${a.email}>`);
}
