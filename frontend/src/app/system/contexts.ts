import { createContext, useContext, useState, useCallback } from "react";
import { Client } from "./client";
import { ButtonType } from "./common";

export type Auth = {
  username: string;
  permissions: string[];
  isAuthenticated: boolean;
  signIn?: (username: string, password: string) => Promise<Auth>;
  signOut?: () => Promise<void>;
};

export const AuthContext = createContext<Auth | null>(null);

export const useAuth = () => {
  const user = useContext(AuthContext);

  if (!user) {
    throw new Error("No auth object available");
  }

  return user;
};

export const ClientContext = createContext<Client | null>(null);

export const useClient = () => {
  const client = useContext(ClientContext);

  if (!client) {
    throw new Error("No client object available");
  }

  return client;
};

export type Modal = {
  title: string;
  content: React.ReactNode;
  closeAction?: () => void;
  actions: {
    label: string;
    action: () => void;
    type?: ButtonType;
  }[];
};

export type ModalStack = {
  stack: ({ id: string } & Modal)[];
  add(modal: Modal): { id: string };
  remove(modal: { id: string }): void;
};

export const ModalsContext = createContext<ModalStack>({
  stack: [],
  add() {
    throw new Error("Not implemented");
  },
  remove() {
    throw new Error("Not implemented");
  },
});

export function useModalStack(): ModalStack {
  const [{ stack, ticker }, setStack] = useState<{
    stack: ModalStack["stack"];
    ticker: number;
  }>({ stack: [], ticker: 0 });

  const addModal = useCallback(
    (modal: Modal) => {
      const nextTicker = ticker + 1;
      const id = `modal-${nextTicker}`;
      setStack({
        stack: [...stack, { ...modal, id: id }],
        ticker: nextTicker,
      });
      return { id };
    },
    [stack, ticker, setStack],
  );
  const removeModal = useCallback(
    (modal: { id: string }) => {
      setStack((prev) => ({
        ...prev,
        stack: prev.stack.filter((m) => m.id !== modal.id),
      }));
    },
    [setStack],
  );
  return {
    stack,
    add: addModal,
    remove: removeModal,
  };
}

export function useModalsContext() {
  return useContext(ModalsContext);
}
