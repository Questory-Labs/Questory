"use client";

import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { Panel } from "@/components/ui";
import { formatDateTime } from "@/lib/dates";
import { useState } from "react";

export type ConnStatus = {
  connected: boolean;
  syncing?: boolean;
  lastSyncedAt?: string | null;
};

export type ListProviderConfig = {
  id: string;
  title: string;
  blurb: string;
  statusPath: string;
  authorizePath?: string;
  passwordConnect?: boolean;
  kitsuConnectPath?: string;
};

type ListProviderCardProps = {
  provider: ListProviderConfig;
  queryKeyPrefix: string;
  fetchFn: <T>(path: string, init?: RequestInit) => Promise<T>;
  urlFn: (path: string) => string;
  eyebrow?: "oauth" | "credentials" | "live";
};

function formatLastSync(value?: string | null) {
  if (!value) return "never";
  return formatDateTime(value);
}

function StatusPill({
  tone,
  children,
}: {
  tone: "ok" | "idle" | "warn";
  children: React.ReactNode;
}) {
  const cls =
    tone === "ok"
      ? "bg-[var(--accent-dim)] text-[var(--accent)]"
      : tone === "warn"
        ? "bg-[var(--bg-3)] text-[var(--ink)]"
        : "bg-[var(--bg-2)] text-[var(--faint)]";
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${cls}`}
    >
      {children}
    </span>
  );
}

function eyebrowLabel(
  provider: ListProviderConfig,
  eyebrow?: ListProviderCardProps["eyebrow"],
) {
  if (eyebrow === "live") return "Live";
  if (eyebrow === "credentials" || provider.passwordConnect) return "Credentials";
  return "OAuth";
}

export function ListProviderCard({
  provider,
  queryKeyPrefix,
  fetchFn,
  urlFn,
  eyebrow,
}: ListProviderCardProps) {
  const store = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const status = useResource({
    id: [`${queryKeyPrefix}-${provider.id}-status`],
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
      void store.touch([`${queryKeyPrefix}-${provider.id}-status`]);
      void store.touch(["shell-sync-status"]);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Connect failed");
    },
  });

  const connected = Boolean(status.value?.connected);
  const syncing = Boolean(status.value?.syncing);

  return (
    <Panel wrapperClassName="h-full" className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
          {eyebrowLabel(provider, eyebrow)}
        </span>
        <StatusPill tone={syncing ? "warn" : connected ? "ok" : "idle"}>
          {syncing ? "Syncing" : connected ? "Connected" : "Connect"}
        </StatusPill>
      </div>
      <h3
        className="mt-3 font-display text-lg tracking-tight text-[var(--ink)]"
        style={{ fontWeight: 700 }}
      >
        {provider.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
        {connected
          ? `Connected · last sync ${formatLastSync(status.value?.lastSyncedAt)}`
          : provider.blurb}
      </p>
      <div className="mt-auto flex flex-col gap-2 pt-5">
        {provider.passwordConnect && !connected ? (
          <>
            <input
              type="email"
              placeholder="Kitsu email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
            <input
              type="password"
              placeholder="Password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            {error ? (
              <p className="text-xs text-[var(--warn)]">{error}</p>
            ) : null}
            <button
              type="button"
              className="btn btn-secondary"
              disabled={connect.busy || !email || !password}
              onClick={() => connect.submit()}
            >
              {connect.busy ? "Connecting…" : "Connect Kitsu"}
            </button>
          </>
        ) : (
          <div className="flex flex-wrap gap-3">
            <a
              href={
                provider.authorizePath ? urlFn(provider.authorizePath) : "#"
              }
              className="btn btn-secondary"
            >
              {connected
                ? `Reconnect ${provider.title}`
                : `Connect ${provider.title}`}
            </a>
          </div>
        )}
      </div>
    </Panel>
  );
}
