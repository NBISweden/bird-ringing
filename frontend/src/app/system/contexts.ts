import { createContext, useContext, Context } from "react";
import { Client } from "./client";

export type User = {
    username: string;
    auth: true;
} | { auth: false }

export const UserContext = createContext<User | null>(null);

export const useUser = () => {
    const user = useContext(UserContext);

    if (!user || user.auth === false) {
        throw new Error("No user object available");
    }

    return user;
}

export const ClientContext = createContext<Client | null>(null);

export const useClient = () => {
    const client = useContext(ClientContext);

    if (!client) {
        throw new Error("No client object available");
    }

    return client;
}