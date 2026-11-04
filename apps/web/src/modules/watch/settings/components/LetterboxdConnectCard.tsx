"use client";

import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { Button } from "@/components/ui";
import { watchFetch } from "@/lib/watch";
import { formatDateTime } from "@/lib/dates";
import { DisconnectButton } from "@/modules/media/sources/components/DisconnectButton";
import { SourceRow, SourceStatusPill } from "@/modules/media/sources/components/SourceRow";
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
      store.touch([["watch-letterboxd-status"], ["watch-sync-status"], ["sources-overview"]]);
      setUsername("");
    },
  });

  const connected = status.value?.connected === true;

  return (
    <SourceRow
      label="Scrape sync"
      title="Letterboxd"
      tone={connected ? "ok" : "idle"}
      status={
        <SourceStatusPill tone={connected ? "ok" : "idle"}>{connected ? "Connected" : "Not connected"}</SourceStatusPill>
      }
      blurb={
        connected
          ? `@${status.value?.username} · last sync ${formatLastSync(status.value?.lastSyncedAt)}`
          : "Connect your Letterboxd username for scheduled diary scrape sync (admin configures selectors)."
      }
      action={
        connected ? (
          <DisconnectButton
            title="Letterboxd"
            path="/letterboxd/connect"
            fetchFn={watchFetch}
            touches={["watch-letterboxd-status", "watch-sync-status"]}
            description="Scheduled diary scrape sync stops. Watches already imported stay."
          />
        ) : null
      }
    >
      {!connected ? (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (username.trim()) connect.submit(username.trim());
          }}
        >
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="letterboxd username"
            className="field min-w-0 flex-1"
            aria-label="Letterboxd username"
          />
          <Button type="submit" disabled={connect.busy || !username.trim()}>
            Connect
          </Button>
        </form>
      ) : null}
      {status.value?.syncCursor ? (
        <p className="mt-2 font-mono text-[11px] text-[var(--faint)]">Latest entry: {status.value.syncCursor}</p>
      ) : null}
    </SourceRow>
  );
};
