"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useResource, type UseResourceResult } from "@questorylabs/qhttp/react";
import type { MeResponse, User } from "@questorylabs/shared";
import { fetchMe, ME_RESOURCE_ID } from "@/lib/auth-api";

export type UserValue = {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  authReady: boolean;
  isLoading: boolean;
  failed: boolean;
  me: UseResourceResult<MeResponse>;
};

const UserContext = createContext<UserValue | null>(null);

function useUserState(): UserValue {
  const me = useResource({
    id: ME_RESOURCE_ID,
    load: fetchMe,
    retries: false,
  });
  const user = me.value?.user ?? null;

  return useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAdmin: user?.isAdmin === true,
      authReady: me.ready || me.failed,
      isLoading: !me.ready && !me.failed,
      failed: me.failed,
      me,
    }),
    [user, me],
  );
}

/** Mount once under ResourceProvider; consumers use useUser(). */
export function UserProvider({ children }: { children: ReactNode }) {
  const value = useUserState();
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

/** Session from GET `/auth/me` — shared across shells, gates, and settings. */
export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within UserProvider");
  }
  return ctx;
}
