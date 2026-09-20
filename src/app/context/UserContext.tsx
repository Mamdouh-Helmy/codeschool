"use client";

import { createContext, useContext, type ReactNode } from "react";

export type CurrentUser = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  image?: string | null;
};

const UserContext = createContext<CurrentUser | null>(null);

export function UserProvider({
  user,
  children,
}: {
  user: CurrentUser | null;
  children: ReactNode;
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useCurrentUser() {
  return useContext(UserContext);
}