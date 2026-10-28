"use client";

import { useEffect, useState } from "react";
import { useAction, useStore } from "@questorylabs/qhttp/react";
import type { UserSyncResponse } from "@questorylabs/shared";
import { apiOnce } from "@/lib/api";
import { parseApiError } from "@/lib/auth-api";
import { USER_SYNC_TICK_MS } from "./steam.settings-shared.constants";

export const userSyncErrorMessage = (err: unknown) => {
  const parsed = parseApiError(err);
  if (parsed.status === 409) return { message: "A sync is already running.", retryAfterSec: 0 };
  if (parsed.status === 429) {
    return {
      message: "Sync was requested recently.",
      retryAfterSec: parsed.retryAfterSec ?? 0,
    };
  }
  return { message: parsed.message || "Could not start a sync.", retryAfterSec: 0 };
};

export function useUserSync() {
  const store = useStore();
  const [error, setError] = useState<string | null>(null);
  const [retryIn, setRetryIn] = useState(0);
  const [queued, setQueued] = useState(false);

  useEffect(() => {
    if (retryIn <= 0) return;
    const t = setTimeout(() => setRetryIn((s) => Math.max(0, s - 1)), USER_SYNC_TICK_MS);
    return () => clearTimeout(t);
  }, [retryIn]);

  const action = useAction({
    run: () => apiOnce<UserSyncResponse>("/sync/user", { method: "POST" }),
    onSuccess: () => {
      setError(null);
      setQueued(true);
      void store.touch(["sync-jobs"]);
      void store.touch(["connections"]);
      void store.touch(["stores"]);
    },
    onError: (err: Error) => {
      const parsed = userSyncErrorMessage(err);
      setQueued(false);
      setError(parsed.message);
      setRetryIn(parsed.retryAfterSec);
    },
  });

  return {
    sync: () => {
      setError(null);
      action.submit();
    },
    busy: action.busy,
    queued,
    error,
    retryIn,
    disabled: action.busy || retryIn > 0,
  };
}
