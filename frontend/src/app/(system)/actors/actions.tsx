import { useCallback } from "react";
import { ClientContext, useModalsContext } from "../contexts";
import { Client } from "../client";
import { useTranslation } from "../internationalization";
import { EmailList } from "@/components/EmailList";
import { chunkArray } from "../utils";
import { joinValueLists, mergeValueListObjects } from "../common";

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

  const emailValues = await Promise.all(
    idChunks.map(
      async (chunk) =>
        (await client.fetchActorValue<string>("email", undefined, chunk))
          .values,
    ),
  );
  const emails = mergeValueListObjects(emailValues);
  const fullNameValues = await Promise.all(
    idChunks.map(
      async (chunk) =>
        (await client.fetchActorValue<string>("full_name", undefined, chunk))
          .values,
    ),
  );
  const fullNames = mergeValueListObjects(fullNameValues);
  return joinValueLists(
    emails,
    fullNames,
    (_key, email, fullName) => `${fullName} <${email}>`,
  );
}
