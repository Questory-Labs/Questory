"use client";

import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { useState } from "react";
import { Button, Panel } from "@/components/ui";
import { api } from "@/lib/api";

type ApiKeyMeta = {
  id: string;
  type: string;
  tokenPrefix: string;
  label?: string | null;
  createdAt: string;
  lastUsedAt?: string | null;
};

type IdentityResponse = {
  steamId: string | null;
  listenbrainzUsername: string | null;
  keys: ApiKeyMeta[];
  nativeScrobbling?: boolean;
};

type CreateResponse = {
  id: string;
  type: string;
  tokenPrefix: string;
  token: string;
  listenbrainzUsername?: string | null;
};

type Props = {
  type: "music_ingest" | "watch_webhook";
  title: string;
  description: string;
  endpointHint?: string;
  /** Drop outer panel chrome when nested in another section. */
  embedded?: boolean;
};

export function ApiKeyPanel({
  type,
  title,
  description,
  endpointHint,
  embedded = false,
}: Props) {
  const store = useStore();
  const [plainToken, setPlainToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const identity = useResource({
    id: ["api-keys-identity"],
    load: () => api<IdentityResponse>("/api-keys/identity"),
  });

  const key = (identity.value?.keys || []).find((k) => k.type === type);
  const nativeLocked =
    type === "music_ingest" && Boolean(identity.value?.nativeScrobbling);

  const create = useAction({
    run: () =>
      api<CreateResponse>("/api-keys", {
        method: "POST",
        body: JSON.stringify({ type }),
      }),
    onSuccess: (data) => {
      setError(null);
      setPlainToken(data.token);
      void store.touch(["api-keys-identity"]);
    },
    onError: (err: Error) => {
      setPlainToken(null);
      setError(err.message || "Failed to create key");
    },
  });

  const revoke = useAction({
    run: (id: string) =>
      api(`/api-keys/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setPlainToken(null);
      setError(null);
      void store.touch(["api-keys-identity"]);
    },
    onError: (err: Error) => {
      setError(err.message || "Failed to revoke key");
    },
  });

  const body = (
    <>
      <h2 className="font-display text-lg font-bold text-[var(--ink)]">
        {title}
      </h2>
      <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>

      {type === "music_ingest" && identity.value?.listenbrainzUsername && (
        <p className="mt-3 font-mono text-xs text-[var(--faint)]">
          LZ_USER / username: {identity.value.listenbrainzUsername}
        </p>
      )}
      {endpointHint && (
        <p className="mt-2 font-mono text-xs text-[var(--faint)]">
          {endpointHint}
        </p>
      )}

      {key ? (
        <p className="mt-3 text-sm text-[var(--ink)]">
          Active key{" "}
          <code className="font-mono text-xs">
            {key.tokenPrefix}…
          </code>
          {key.lastUsedAt
            ? ` · last used ${new Date(key.lastUsedAt).toLocaleString()}`
            : " · never used"}
        </p>
      ) : (
        <p className="mt-3 text-sm text-[var(--muted)]">No active key.</p>
      )}

      {plainToken && (
        <div className="mt-3 border border-[var(--accent)] bg-[var(--bg-2)] p-3">
          <p className="text-xs text-[var(--muted)]">
            Copy now — this plaintext is shown once.
          </p>
          <code className="mt-1 block break-all font-mono text-sm text-[var(--ink)]">
            {plainToken}
          </code>
        </div>
      )}

      {nativeLocked ? (
        <p className="mt-3 text-sm text-[var(--muted)]">
          ListenBrainz ingest is disabled while native scrobbling is on.
          Disconnect Last.fm under Music → Sources to mint or use ingest keys.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            variant="primary"
            disabled={create.busy}
            onClick={() => create.submit()}
          >
            {create.busy
              ? "Generating…"
              : key
                ? "Rotate key"
                : "Generate key"}
          </Button>
          {key && (
            <Button
              variant="secondary"
              disabled={revoke.busy}
              onClick={() => revoke.submit(key.id)}
            >
              Revoke
            </Button>
          )}
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>
      )}
    </>
  );

  if (embedded) {
    return <section className="mt-5">{body}</section>;
  }

  return (
    <Panel wrapperClassName="mt-8 max-w-lg" className="p-5">
      {body}
    </Panel>
  );
}
