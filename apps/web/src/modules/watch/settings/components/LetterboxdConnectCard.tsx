"use client";

import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { Button, Panel } from "@/components/ui";
import { watchFetch } from "@/lib/watch";
import { formatDateTime } from "@/lib/dates";
import { useState } from "react";

type LetterboxdStatus = {
  connected: boolean;
  username: string | null;
  lastSyncedAt: string | null;
  syncCursor: string | null;
};

const formatLastSync = (value?: string | null) => {
  if (!value) return "never";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : formatDateTime(value);
};

export const LetterboxdConnectCard = () => {
  const store = useStore();
  const [username, setUsername] = useState("");

  const status = useResource({
    id: ["watch-letterboxd-status"],
    load: () => watchFetch<LetterboxdStatus>("/letterboxd/status"),
  });

  const connect = useAction({
    run: (name: string) =>
      watchFetch<LetterboxdStatus>("/letterboxd/connect", {
        method: "POST",
        body: JSON.stringify({ username: name }),
      }),
    onSuccess: () => {
      store.touch(["watch-letterboxd-status"]);
      store.touch(["watch-sync-status"]);
    },
  });

  const disconnect = useAction({
    run: () =>
      watchFetch("/letterboxd/connect", { method: "DELETE" }),
    onSuccess: () => {
      store.touch(["watch-letterboxd-status"]);
      store.touch(["watch-sync-status"]);
      setUsername("");
    },
  });

  const connected = status.value?.connected === true;

  return (
    <Panel wrapperClassName="h-full" className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
          Scrape sync
        </span>
        <span
          className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
            connected
              ? "bg-[var(--accent-dim)] text-[var(--accent)]"
              : "bg-[var(--bg-2)] text-[var(--faint)]"
          }`}
        >
          {connected ? "Connected" : "Connect"}
        </span>
      </div>
      <h2
        className="mt-3 font-display text-xl tracking-tight text-[var(--ink)]"
        style={{ fontWeight: 700 }}
      >
        Letterboxd
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
        {connected
          ? `@${status.value?.username} · last sync ${formatLastSync(status.value?.lastSyncedAt)}`
          : "Connect your Letterboxd username for scheduled diary scrape sync (admin configures selectors)."}
      </p>
      <div className="mt-auto space-y-3 pt-5">
        {!connected ? (
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="letterboxd username"
              className="min-w-0 flex-1 rounded border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2 text-sm text-[var(--ink)]"
              aria-label="Letterboxd username"
            />
            <Button
              disabled={connect.busy || !username.trim()}
              onClick={() => connect.submit(username.trim())}
            >
              Connect
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={disconnect.busy}
              onClick={() => disconnect.submit()}
            >
              Disconnect
            </Button>
          </div>
        )}
        {status.value?.syncCursor ? (
          <p className="font-mono text-[11px] text-[var(--faint)]">
            Latest entry: {status.value.syncCursor}
          </p>
        ) : null}
      </div>
    </Panel>
  );
}
