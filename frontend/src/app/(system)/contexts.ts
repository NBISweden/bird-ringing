import { createContext, useContext, useState, useCallback } from "react";
import { Client } from "./client";
import { ButtonType } from "./common";

export type Config = {
  authUrl: string;
  apiRootUrl: string;
  defaultLang: string;
};

export const ConfigContext = createContext<Config | null>(null);

export const useConfig = () => {
  const config = useContext(ConfigContext);

  if (!config) {
    throw new Error("No config available");
  }

  return config;
};

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

export type ModalRef = unknown;

export type ModalStack = {
  stack: Modal[];
  add(modal: Modal): ModalRef;
  remove(modal: ModalRef): void;
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
  const [stack, setStack] = useState<ModalStack["stack"]>([]);

  const addModal = useCallback(
    (modal: Modal) => {
      setStack((prev) => {
        return [...prev, modal];
      });
      return modal;
    },
    [setStack],
  );
  const removeModal = useCallback(
    (modal: ModalRef) => {
      setStack((prev) => {
        return prev.filter((m) => m !== modal);
      });
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
