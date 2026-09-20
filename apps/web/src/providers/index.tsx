"use client";

import { ResourceProvider } from "@questorylabs/qhttp/react";
import { DropEpochProvider, StatusProvider } from "./StatusProvider";
import { EnterpriseEnabledProvider } from "./EnterpriseEnabledProvider";
import { NotificationProvider } from "./NotificationProvider";
import { UserProvider } from "./UserProvider";

const RESOURCE_DEFAULTS = {
  freshFor: 30_000,
  retries: false,
} as const;

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ResourceProvider defaults={RESOURCE_DEFAULTS}>
      <DropEpochProvider>
        <UserProvider>
          <StatusProvider>
            <EnterpriseEnabledProvider>
              <NotificationProvider>{children}</NotificationProvider>
            </EnterpriseEnabledProvider>
          </StatusProvider>
        </UserProvider>
      </DropEpochProvider>
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
  DropEpochProvider,
  useDropEpochBump,
  useStatus,
  useMusicEnabled,
  useWatchEnabled,
  useReadEnabled,
  useFeatureSources,
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
