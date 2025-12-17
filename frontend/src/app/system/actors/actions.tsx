import { useCallback } from "react";
import { ClientContext, useClient, useModalsContext } from "../contexts";
import useSWR from "swr";
import { Client } from "../client";
import Spinner from "@/components/Spinner";
import { Alert } from "@/components/Alert";

export function useFetchEmailAddressesAction(client: Client) {
  const modalStack = useModalsContext();

  const action = useCallback((itemIds: Set<string>) => {
    modalStack.add({
      title: "Hämta e-postadresser för ringare",
      content: (
        <ClientContext.Provider value={client}>
          <ActorEmailList ids={Array.from(itemIds)}/>
        </ClientContext.Provider>
      ),
      actions: [
        {
          label: "Stäng",
          action: () => {},
          type: "primary",
        }
      ]
    })
  }, [modalStack])
  return action;
}

async function fetchActorProperty([client, ids, property]: [Client, string[], string]): Promise<string[]> {
  return client.fetchActorProperty(ids, property)
}

function ActorEmailList({ids}: {ids: string[]}) {
  const client = useClient();

  const {data, isLoading, error} = useSWR(
    [client, ids, "email_listing"],
    fetchActorProperty,
    {fallbackData: []}
  );

  return isLoading ? (
    <>
      Loading email listings
      <Spinner />
    </>
  ) : (
    error ? (
      <Alert type="danger">{String(error)}</Alert>
    ) : (
      <>
        {data.join("; ")}
      </>
    )
  )
}