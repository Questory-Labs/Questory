"use client";

import { useMutation, useQuery, useQueryClient } from "@questorylabs/qhttp/react";
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
  const qc = useQueryClient();
  const [plainToken, setPlainToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const identity = useQuery({
    queryKey: ["api-keys-identity"],
    queryFn: () => api<IdentityResponse>("/api-keys/identity"),
  });

  const key = (identity.data?.keys || []).find((k) => k.type === type);

  const create = useMutation({
    mutationFn: () =>
      api<CreateResponse>("/api-keys", {
        method: "POST",
        body: JSON.stringify({ type }),
      }),
    onSuccess: (data) => {
      setError(null);
      setPlainToken(data.token);
      void qc.invalidateQueries({ queryKey: ["api-keys-identity"] });
    },
    onError: (err: Error) => {
      setPlainToken(null);
      setError(err.message || "Failed to create key");
    },
  });

  const revoke = useMutation({
    mutationFn: (id: string) =>
      api(`/api-keys/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setPlainToken(null);
      setError(null);
      void qc.invalidateQueries({ queryKey: ["api-keys-identity"] });
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

      {type === "music_ingest" && identity.data?.listenbrainzUsername && (
        <p className="mt-3 font-mono text-xs text-[var(--faint)]">
          LZ_USER / username: {identity.data.listenbrainzUsername}
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

      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          variant="primary"
          disabled={create.isPending}
          onClick={() => create.mutate()}
        >
          {create.isPending
            ? "Generating…"
            : key
              ? "Rotate key"
              : "Generate key"}
        </Button>
        {key && (
          <Button
            variant="secondary"
            disabled={revoke.isPending}
            onClick={() => revoke.mutate(key.id)}
          >
            Revoke
          </Button>
        )}
      </div>

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
