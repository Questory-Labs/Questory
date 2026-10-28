"use client";

import { useState } from "react";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import type { ConnStatus, ListProviderConfig } from "@/components/sources/ListProviderCard";
import { Button } from "@/components/ui";
import { formatDateTime } from "@/lib/dates";
import { DisconnectButton } from "./DisconnectButton";
import { SourceRow, SourceStatusPill } from "./SourceRow";

export const ListProviderRow = ({
  provider,
  queryKeyPrefix,
  fetchFn,
  urlFn,
}: {
  provider: ListProviderConfig;
  queryKeyPrefix: string;
  fetchFn: <T>(path: string, init?: RequestInit) => Promise<T>;
  urlFn: (path: string) => string;
}) => {
  const store = useStore();
  const statusKey = `${queryKeyPrefix}-${provider.id}-status`;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const status = useResource({
    id: [statusKey],
    load: () => fetchFn<ConnStatus>(provider.statusPath),
  });

  const connect = useAction({
    run: () =>
      fetchFn<{ ok: boolean }>(provider.kitsuConnectPath ?? "/kitsu/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }),
    onSuccess: () => {
      setError(null);
      setPassword("");
      store.touch([[statusKey], ["shell-sync-status"], ["sources-overview"]]);
    },
    onError: (err) => setError(err.message || "Connect failed"),
  });

  const connected = Boolean(status.value?.connected);
  const syncing = Boolean(status.value?.syncing);
  const tone = syncing ? "warn" : connected ? "ok" : "idle";
  const showPassword = provider.passwordConnect && !connected;

  return (
    <SourceRow
      title={provider.title}
      tone={tone}
      status={
        <SourceStatusPill tone={tone}>
          {syncing ? "Syncing" : connected ? "Connected" : "Not connected"}
        </SourceStatusPill>
      }
      blurb={
        connected
          ? `Connected · last sync ${status.value?.lastSyncedAt ? formatDateTime(status.value.lastSyncedAt) : "never"}`
          : provider.blurb
      }
      action={
        connected ? (
          <>
            {provider.authorizePath ? (
              <a href={urlFn(provider.authorizePath)} className="btn btn-secondary">
                Reconnect
              </a>
            ) : null}
            <DisconnectButton
              title={provider.title}
              path={`/${provider.id}`}
              fetchFn={fetchFn}
              touches={[statusKey]}
            />
          </>
        ) : !showPassword && provider.authorizePath ? (
          <a href={urlFn(provider.authorizePath)} className="btn btn-primary">
            Connect
          </a>
        ) : null
      }
    >
      {showPassword ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            connect.submit();
          }}
        >
          <input
            type="email"
            aria-label={`${provider.title} email`}
            placeholder={`${provider.title} email`}
            className="field min-w-0 flex-[1_1_180px]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
          <input
            type="password"
            aria-label="Password"
            placeholder="Password"
            className="field min-w-0 flex-[1_1_160px]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <Button type="submit" variant="secondary" disabled={connect.busy || !email || !password}>
            {connect.busy ? "Connecting…" : `Connect ${provider.title}`}
          </Button>
          {error ? <p className="w-full text-xs text-[var(--warn)]">{error}</p> : null}
        </form>
      ) : null}
    </SourceRow>
  );
};
