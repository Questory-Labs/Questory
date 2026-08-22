"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  useAction,
  useResource,
  useStore,
  type UseResourceResult,
} from "@questorylabs/qhttp/react";
import type { AppNotification } from "@questorylabs/shared";
import { api } from "@/lib/api";
import { useUser } from "./UserProvider";

export const NOTIFICATIONS_RESOURCE_ID = ["notifications"] as const;
export const NOTIFICATIONS_UNREAD_RESOURCE_ID = [
  "notifications-unread",
] as const;

type UnreadCount = { count: number };

export type NotificationsValue = {
  unreadCount: number;
  unread: UseResourceResult<UnreadCount>;
  items: AppNotification[];
  list: UseResourceResult<AppNotification[]>;
  listOpen: boolean;
  setListOpen: (open: boolean) => void;
  markAllRead: () => void;
  markReadBusy: boolean;
};

const NotificationsContext = createContext<NotificationsValue | null>(null);

function useNotificationsState(): NotificationsValue {
  const { isAuthenticated } = useUser();
  const store = useStore();
  const [listOpen, setListOpen] = useState(false);

  const unread = useResource({
    id: NOTIFICATIONS_UNREAD_RESOURCE_ID,
    load: () => api<UnreadCount>("/notifications/unread-count"),
    when: isAuthenticated,
    retries: false,
    refreshEvery: 30_000,
  });

  const list = useResource({
    id: NOTIFICATIONS_RESOURCE_ID,
    load: () => api<AppNotification[]>("/notifications"),
    when: isAuthenticated && listOpen,
  });

  const markRead = useAction({
    run: () => api("/notifications/read", { method: "POST" }),
    onSuccess: () => {
      store.touch(NOTIFICATIONS_RESOURCE_ID);
      store.touch(NOTIFICATIONS_UNREAD_RESOURCE_ID);
    },
  });

  return useMemo(
    () => ({
      unreadCount: unread.value?.count ?? 0,
      unread,
      items: list.value ?? [],
      list,
      listOpen,
      setListOpen,
      markAllRead: () => markRead.submit(),
      markReadBusy: markRead.busy,
    }),
    [unread, list, listOpen, markRead],
  );
}

/** Mount once under UserProvider; consumers use useNotifications(). */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const value = useNotificationsState();
  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error(
      "useNotifications must be used within NotificationProvider",
    );
  }
  return ctx;
}
