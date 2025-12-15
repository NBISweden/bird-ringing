import { useCallback } from "react";
import { useModalsContext } from "../contexts";

export function useFetchEmailAddressesAction() {
  const modalStack = useModalsContext();
  
  const action = useCallback((itemIds: Set<string>) => {
    modalStack.add({
      title: "Hämta e-postadresser för ringare",
      content: <ul>{Array.from(itemIds).map(id => (
        <li key={id}>{id}</li>
      ))}</ul>,
      closeAction: () => console.log("Close action"),
      actions: [
        {
          label: "Stäng",
          action: () => console.log("Action action"),
          type: "primary",
        }
      ]
    })
  }, [modalStack])
  return action;
}