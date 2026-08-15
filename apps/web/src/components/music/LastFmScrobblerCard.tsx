"use client";

import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import type { MusicScrobblerStatus } from "@questorylabs/shared";
import { useState } from "react";
import { Button, Dialog } from "@/components/ui";
import { fetchMusicHealth, musicFetch, musicUrl } from "@/lib/music";
import { MusicSourceCard, MusicStatusPill } from "./MusicSourceCard";

function formatLastSync(iso: string | null): string {
  if (!iso) return "never";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "never";
  return date.toLocaleString();
}

export function LastFmScrobblerCard() {
  const store = useStore();
  const [confirm, setConfirm] = useState<"connect" | "disconnect" | null>(null);

  const health = useResource({
    id: ["music-health"],
    load: fetchMusicHealth,
    freshFor: 30_000,
    retries: false,
  });

  const status = useResource({
    id: ["music-scrobbler-lastfm"],
    load: () => musicFetch<MusicScrobblerStatus>("/scrobbler/lastfm/status"),
    when: health.value?.lastfmConfigured === true,
  });

  const lastfm = status.value?.lastfm;
  const connected = Boolean(lastfm?.connected);

  const disconnect = useAction({
    run: () => musicFetch("/scrobbler/lastfm", { method: "DELETE" }),
    onSuccess: () => {
      setConfirm(null);
      void store.touch(["music-scrobbler-lastfm"]);
      void store.touch(["api-keys-identity"]);
    },
  });

  if (health.value?.lastfmConfigured !== true) return null;

  const blurb = status.failed
    ? "Could not load Last.fm status from the API. Check the API logs (schema push may be needed)."
    : connected
      ? `Connected as ${lastfm?.username ?? "Last.fm"} · last sync ${formatLastSync(lastfm?.lastSyncedAt ?? null)}. ListenBrainz ingest is disabled while this is on.`
      : "Poll Last.fm for what you are listening to. Connecting disables multi-scrobbler / ListenBrainz ingest for your account.";

  return (
    <>
      <MusicSourceCard
        label="Native"
        title="Last.fm"
        blurb={blurb}
        status={
          connected ? (
            <MusicStatusPill tone={lastfm?.lastError ? "warn" : "ok"}>
              {lastfm?.lastError ? "Reconnect" : "Connected"}
            </MusicStatusPill>
          ) : (
            <MusicStatusPill tone="idle">Connect</MusicStatusPill>
          )
        }
      >
        {lastfm?.lastError ? (
          <p className="mb-3 text-sm text-[var(--danger)]" role="alert">
            {lastfm.lastError === "auth_failed"
              ? "Last.fm session expired. Reconnect to keep scrobbling."
              : lastfm.lastError}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => setConfirm("connect")}
          >
            {connected ? "Reconnect Last.fm" : "Connect Last.fm"}
          </Button>
          {connected ? (
            <Button
              variant="ghost-danger"
              onClick={() => setConfirm("disconnect")}
            >
              Disconnect
            </Button>
          ) : null}
        </div>
      </MusicSourceCard>

      <Dialog
        open={confirm === "connect"}
        onClose={() => setConfirm(null)}
        title={connected ? "Reconnect Last.fm?" : "Connect Last.fm?"}
      >
        <p className="text-sm text-[var(--muted)]">
          This turns on Questory native scrobbling and permanently disables
          ListenBrainz-compatible ingest (multi-scrobbler) for your account until
          you disconnect Last.fm. Existing ingest keys are kept but will be
          rejected.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirm(null)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              window.location.href = musicUrl("/scrobbler/lastfm/authorize");
            }}
          >
            Continue
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={confirm === "disconnect"}
        onClose={() => setConfirm(null)}
        title="Disconnect Last.fm?"
      >
        <p className="text-sm text-[var(--muted)]">
          Native Last.fm polling stops. ListenBrainz ingest keys will work again
          if you still have one.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirm(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={disconnect.busy}
            onClick={() => disconnect.submit()}
          >
            {disconnect.busy ? "Disconnecting…" : "Disconnect"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
