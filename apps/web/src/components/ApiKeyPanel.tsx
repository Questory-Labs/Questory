"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
};

export function ApiKeyPanel({ type, title, description, endpointHint }: Props) {
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

  return (
    <section className="panel mt-8 max-w-lg p-5">
      <h2
        className="text-lg"
        style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
      >
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
        <div className="mt-3 rounded-md border border-[var(--accent)] bg-[var(--bg-2)] p-3">
          <p className="text-xs text-[var(--muted)]">
            Copy now — this plaintext is shown once.
          </p>
          <code className="mt-1 block break-all font-mono text-sm text-[var(--ink)]">
            {plainToken}
          </code>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={create.isPending}
          onClick={() => create.mutate()}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#0b1218] disabled:opacity-50"
        >
          {create.isPending
            ? "Generating…"
            : key
              ? "Rotate key"
              : "Generate key"}
        </button>
        {key && (
          <button
            type="button"
            disabled={revoke.isPending}
            onClick={() => revoke.mutate(key.id)}
            className="rounded-md border border-[var(--line)] px-4 py-2 text-sm text-[var(--ink)] disabled:opacity-50"
          >
            Revoke
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </section>
  );
}
