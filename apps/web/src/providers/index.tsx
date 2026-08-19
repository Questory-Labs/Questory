"use client";

import { ResourceProvider } from "@questorylabs/qhttp/react";
import { EnterpriseEnabledProvider } from "./EnterpriseEnabledProvider";
import { NotificationProvider } from "./NotificationProvider";
import { StatusProvider } from "./StatusProvider";
import { UserProvider } from "./UserProvider";

const RESOURCE_DEFAULTS = {
  freshFor: 30_000,
  retries: false,
} as const;

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ResourceProvider defaults={RESOURCE_DEFAULTS}>
      <UserProvider>
        <StatusProvider>
          <EnterpriseEnabledProvider>
            <NotificationProvider>{children}</NotificationProvider>
          </EnterpriseEnabledProvider>
        </StatusProvider>
      </UserProvider>
    </ResourceProvider>
  );
}

export { UserProvider, useUser, type UserValue } from "./UserProvider";
export {
  NotificationProvider,
  useNotifications,
  NOTIFICATIONS_RESOURCE_ID,
  NOTIFICATIONS_UNREAD_RESOURCE_ID,
  type NotificationsValue,
} from "./NotificationProvider";
export {
  StatusProvider,
  useStatus,
  useMusicEnabled,
  useWatchEnabled,
  useReadEnabled,
  type StatusValue,
  type MusicEnabledValue,
  type WatchEnabledValue,
  type ReadEnabledValue,
} from "./StatusProvider";
export {
  EnterpriseEnabledProvider,
  useEnterpriseEnabled,
  type EnterpriseEnabledValue,
} from "./EnterpriseEnabledProvider";
