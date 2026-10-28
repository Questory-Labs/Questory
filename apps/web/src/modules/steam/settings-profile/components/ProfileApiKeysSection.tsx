"use client";

import { useState } from "react";
import { Button, Dialog, ResourceStatus, SkeletonListRows } from "@questorylabs/ui";
import { formatDateTime } from "@/lib/dates";
import type {
  ApiKeyType,
  ProfileApiKeys,
} from "../steam.settings-profile.types";
import { maskToken } from "../steam.settings-profile.utils";
import { ProfileSection } from "./ProfileSection";

export type ProfileApiKeyRow = {
  type: ApiKeyType;
  title: string;
  description: string;
  endpointHint: string;
};

type Confirm = { kind: "rotate" | "revoke"; row: ProfileApiKeyRow; keyId: string };

const KeyRow = ({
  row,
  apiKeys,
  onConfirm,
}: {
  row: ProfileApiKeyRow;
  apiKeys: ProfileApiKeys;
  onConfirm: (c: Confirm) => void;
}) => {
  const identity = apiKeys.identity.value;
  const key = (identity?.keys || []).find((k) => k.type === row.type);
  const nativeLocked = row.type === "music_ingest" && Boolean(identity?.nativeScrobbling);
  const fresh = apiKeys.plainToken?.type === row.type ? apiKeys.plainToken.token : null;
  const creating = apiKeys.create.busy && apiKeys.create.input === row.type;
  return (
    <li className="rounded-2xl px-2.5 py-3 transition-colors duration-300 hover:bg-white/[0.03]">
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full ${key ? "bg-[var(--ok)]" : "bg-[var(--faint)]"}`}
        />
        <span className="min-w-0 flex-[1_1_200px]">
          <span className="block font-normal">{row.title}</span>
          <code className="font-mono text-xs text-[var(--muted)]">
            {key ? maskToken(key.tokenPrefix) : "No active key"}
          </code>
          {key ? (
            <span className="ml-2 text-xs text-[var(--faint)]">
              {key.lastUsedAt ? `last used ${formatDateTime(key.lastUsedAt)}` : "never used"}
            </span>
          ) : null}
        </span>
        {fresh ? (
          <Button
            variant="secondary"
            size="sm"
            aria-label={`Copy ${row.title} key`}
            onClick={() => apiKeys.copy(row.type)}
          >
            {apiKeys.copied === row.type ? "Copied" : "Copy"}
          </Button>
        ) : null}
        {nativeLocked ? null : key ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Rotate ${row.title} key`}
              disabled={creating}
              onClick={() => onConfirm({ kind: "rotate", row, keyId: key.id })}
            >
              {creating ? "Rotating…" : "Rotate"}
            </Button>
            <Button
              variant="ghost-danger"
              size="sm"
              aria-label={`Revoke ${row.title} key`}
              disabled={apiKeys.revoke.busy}
              onClick={() => onConfirm({ kind: "revoke", row, keyId: key.id })}
            >
              Revoke
            </Button>
          </>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            disabled={creating}
            onClick={() => apiKeys.create.submit(row.type)}
          >
            {creating ? "Generating…" : "Generate key"}
          </Button>
        )}
      </div>
      <div className="mt-1.5 pl-5">
        <p className="text-xs text-[var(--muted)]">{row.description}</p>
        {row.type === "music_ingest" && identity?.listenbrainzUsername ? (
          <p className="mt-1 font-mono text-[11px] text-[var(--faint)]">
            LZ_USER / username: {identity.listenbrainzUsername}
          </p>
        ) : null}
        <p className="mt-1 break-all font-mono text-[11px] text-[var(--faint)]">
          {row.endpointHint}
        </p>
        {fresh ? (
          <div className="mt-2 rounded-xl border border-[var(--accent)]/40 bg-black/30 p-3">
            <p className="text-xs text-[var(--muted)]">
              Copy now — this plaintext is shown once.
            </p>
            <code className="mt-1 block break-all font-mono text-sm text-[var(--ink)]">
              {fresh}
            </code>
          </div>
        ) : null}
        {nativeLocked ? (
          <p className="mt-1.5 text-sm text-[var(--muted)]">
            ListenBrainz ingest is disabled while native scrobbling is on.
            Disconnect Last.fm under Music → Sources to mint or use ingest keys.
          </p>
        ) : null}
      </div>
    </li>
  );
};

export const ProfileApiKeysSection = ({
  rows,
  apiKeys,
}: {
  rows: ProfileApiKeyRow[];
  apiKeys: ProfileApiKeys;
}) => {
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  if (!rows.length) return null;
  const run = () => {
    if (!confirm) return;
    if (confirm.kind === "rotate") apiKeys.create.submit(confirm.row.type);
    else apiKeys.revoke.submit(confirm.keyId);
    setConfirm(null);
  };
  return (
    <ProfileSection
      id="profile-keys"
      index={3}
      title="API keys"
      description="Treat these like passwords. Rotating a key breaks anything still using the old one."
      className="pb-3"
    >
      <ResourceStatus
        failed={apiKeys.identity.failed}
        empty={apiKeys.identity.empty}
        loading={<SkeletonListRows count={rows.length} className="mt-3" />}
        error={
          <p className="mt-3 text-sm text-[var(--danger)]">Could not load API keys.</p>
        }
      >
        <ul className="-mx-2.5 mt-3">
          {rows.map((row) => (
            <KeyRow key={row.type} row={row} apiKeys={apiKeys} onConfirm={setConfirm} />
          ))}
        </ul>
      </ResourceStatus>
      {apiKeys.error ? (
        <p role="alert" className="mt-2 text-sm text-[var(--danger)]">
          {apiKeys.error}
        </p>
      ) : null}
      <Dialog
        open={confirm != null}
        onClose={() => setConfirm(null)}
        title={confirm?.kind === "rotate" ? "Rotate key?" : "Revoke key?"}
      >
        <p className="text-sm text-[var(--muted)]">
          {confirm?.kind === "rotate"
            ? `A new ${confirm.row.title} key replaces the current one. Anything still using the old key stops working.`
            : `Revoke the ${confirm?.row.title ?? ""} key? Anything still using it stops working.`}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirm(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={run}>
            {confirm?.kind === "rotate" ? "Rotate key" : "Revoke key"}
          </Button>
        </div>
      </Dialog>
    </ProfileSection>
  );
};
