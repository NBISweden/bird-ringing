import { createContext, useContext } from "react";

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