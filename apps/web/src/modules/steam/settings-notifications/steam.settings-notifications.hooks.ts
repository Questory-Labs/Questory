"use client";

import { useState } from "react";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import type {
  NotificationChannel,
  NotificationChannelCreate,
  NotificationChannelListResponse,
  NotificationChannelUpdate,
} from "@questorylabs/shared";
import { api } from "@/lib/api";
import { parseApiError } from "@/lib/auth-api";
import type {
  ChannelTestResult,
  NotificationChannelsState,
} from "./steam.settings-notifications.types";

const ID = ["notification-channels"];

export function useNotificationChannels(): NotificationChannelsState {
  const store = useStore();
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<ChannelTestResult | null>(null);
  const [resendResult, setResendResult] = useState<ChannelTestResult | null>(null);

  const channels = useResource({
    id: ID,
    load: () => api<NotificationChannelListResponse>("/notifications/channels"),
  });
  const touch = () => void store.touch(ID);
  const fail = (fallback: string) => (err: Error) =>
    setError(parseApiError(err).message || fallback);

  const create = useAction({
    run: (body: NotificationChannelCreate) =>
      api<NotificationChannel>("/notifications/channels", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      setError(null);
      touch();
    },
    onError: fail("Failed to add channel"),
  });

  const update = useAction({
    run: ({ id, patch }: { id: string; patch: NotificationChannelUpdate }) =>
      api<NotificationChannel>(`/notifications/channels/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      setError(null);
      touch();
    },
    onError: fail("Failed to update channel"),
  });

  const remove = useAction({
    run: (id: string) =>
      api<unknown>(`/notifications/channels/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setError(null);
      setTestResult(null);
      touch();
    },
    onError: fail("Failed to remove channel"),
  });

  const test = useAction({
    run: (id: string) =>
      api<{ ok: boolean; error: string | null }>(`/notifications/channels/${id}/test`, {
        method: "POST",
      }),
    onSuccess: (data, id) => {
      setError(null);
      setTestResult({ id, ...data });
      touch();
    },
    onError: fail("Test failed"),
  });

  const resend = useAction({
    run: (id: string) =>
      api<{ ok: boolean; error: string | null }>(
        `/notifications/channels/${id}/resend-verification`,
        { method: "POST" },
      ),
    onSuccess: (data, id) => {
      setError(null);
      setResendResult({ id, ...data });
      touch();
    },
    onError: fail("Could not resend the confirmation link"),
  });

  return {
    channels,
    create,
    update,
    remove,
    test,
    testResult,
    resend,
    resendResult,
    error,
    clearError: () => setError(null),
  };
}
