import { useCallback } from "react";
import { ClientContext, useClient, useModalsContext } from "../contexts";
import useSWR from "swr";
import { Client } from "../client";
import Spinner from "@/components/Spinner";
import { Alert } from "@/components/Alert";

export function useFetchEmailAddressesAction(client: Client) {
  const modalStack = useModalsContext();

  const action = useCallback(
    (itemIds: Set<string>) => {
      modalStack.add({
        title: "Hämta e-postadresser för ringare",
        content: (
          <ClientContext.Provider value={client}>
            <ActorEmailList ids={Array.from(itemIds)} />
          </ClientContext.Provider>
        ),
        actions: [
          {
            label: "Stäng",
            action: () => {},
            type: "primary",
          },
        ],
      });
    },
    [modalStack, client],
  );
  return action;
}

export function useSendLicenseEmailAction() {
  const modalStack = useModalsContext();

  const action = useCallback(
    () => {
      modalStack.add({
        title: "Skicka ut licenser",
        content: (
          <>
            <Spinner />
            <span className="ms-3">
              Skickande av license är ännu inte implementerad.
            </span>
          </>
        ),
        actions: [
          {
            label: "Stäng",
            action: () => {},
            type: "primary",
          },
        ],
      });
    },
    [modalStack],
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

  const { data, isLoading, error } = useSWR([client, ids], fetchActorEmail, {
    fallbackData: [],
  });

  return isLoading ? (
    <>
      <Spinner />
      <span className="ms-3">Loading email listings</span>
    </>
  ) : error ? (
    <Alert type="danger">{String(error)}</Alert>
  ) : (
    <>{data.join("; ")}</>
  );
}
