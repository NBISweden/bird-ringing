import { createContext, useContext } from "react";

export type User = {
    username: string;
}

export const UserContext = createContext<User | null>(null);

export const useUser = () => {
    const user = useContext(UserContext);

    if (!user) {
        throw new Error("No user object available");
    }

    return user;
}