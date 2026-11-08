"use client";

import { useState } from "react";
import {
  PUBLIC_API_SCOPE_LABELS,
  PUBLIC_API_SCOPES,
  type PublicApiKey,
  type PublicApiScope,
} from "@questorylabs/shared";
import { Button, Dialog, ResourceStatus, SkeletonListRows } from "@questorylabs/ui";
import { formatDateTime } from "@/lib/dates";
import type { ProfilePublicApiKeys } from "../steam.settings-profile.types";
import { PROFILE_INPUT_CLASS } from "../steam.settings-profile.constants";
import { maskToken } from "../steam.settings-profile.utils";
import { ProfileSection } from "./ProfileSection";

const DOCS_URL = "https://github.com/Questory-Labs/Questory/blob/main/docs/public-api.md";

const KeyRow = ({
  row,
  busy,
  onRevoke,
}: {
  row: PublicApiKey;
  busy: boolean;
  onRevoke: (row: PublicApiKey) => void;
}) => (
  <li className="rounded-2xl px-2.5 py-3 transition-colors duration-300 hover:bg-white/[0.03]">
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--ok)]" />
      <span className="min-w-0 flex-[1_1_200px]">
        <span className="block font-normal">{row.label || "Untitled key"}</span>
        <code className="font-mono text-xs text-[var(--muted)]">{maskToken(row.tokenPrefix)}</code>
        <span className="ml-2 text-xs text-[var(--faint)]">
          {row.lastUsedAt ? `last used ${formatDateTime(row.lastUsedAt)}` : "never used"}
        </span>
      </span>
      <Button
        variant="ghost-danger"
        size="sm"
        aria-label={`Revoke ${row.label || "public"} key`}
        disabled={busy}
        onClick={() => onRevoke(row)}
      >
        Revoke
      </Button>
    </div>
    <p className="mt-1.5 pl-5 text-xs text-[var(--muted)]">
      {row.scopes.map((s) => PUBLIC_API_SCOPE_LABELS[s] ?? s).join(" · ")}
    </p>
  </li>
);

export const ProfilePublicApiKeysSection = ({
  publicKeys,
}: {
  publicKeys: ProfilePublicApiKeys;
}) => {
  const [label, setLabel] = useState("");
  const [scopes, setScopes] = useState<PublicApiScope[]>([]);
  const [confirm, setConfirm] = useState<PublicApiKey | null>(null);
  const rows = publicKeys.keys.value ?? [];
  const canCreate = label.trim().length > 0 && scopes.length > 0 && !publicKeys.create.busy;

  const toggle = (scope: PublicApiScope) =>
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );

  const submit = () => {
    if (!canCreate) return;
    publicKeys.create.submit({ label: label.trim(), scopes });
    setLabel("");
    setScopes([]);
  };

  const revoke = () => {
    if (!confirm) return;
    publicKeys.revoke.submit(confirm.id);
    setConfirm(null);
  };

  return (
    <ProfileSection
      id="profile-public-keys"
      index={4}
      title="Public API keys"
      description={
        <>
          Read-only access for scripts, widgets, and dashboards. Each key only sees the scopes
          you pick.{" "}
          <a
            className="underline underline-offset-2"
            href={DOCS_URL}
            target="_blank"
            rel="noreferrer"
          >
            API docs
          </a>
        </>
      }
      className="pb-3"
    >
      <form
        className="mt-3 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-[var(--muted)]">Label</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={80}
            placeholder="Home dashboard"
            autoComplete="off"
            className={PROFILE_INPUT_CLASS}
          />
        </label>
        <fieldset>
          <legend className="mb-1 text-xs text-[var(--muted)]">Scopes</legend>
          <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
            {PUBLIC_API_SCOPES.map((scope) => (
              <label key={scope} className="field-check text-sm">
                <input
                  type="checkbox"
                  checked={scopes.includes(scope)}
                  onChange={() => toggle(scope)}
                />
                <span>
                  {PUBLIC_API_SCOPE_LABELS[scope]}
                  <code className="ml-1.5 font-mono text-[11px] text-[var(--faint)]">{scope}</code>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <Button type="submit" variant="secondary" size="sm" disabled={!canCreate}>
            {publicKeys.create.busy ? "Generating…" : "Create key"}
          </Button>
        </div>
      </form>

      {publicKeys.created ? (
        <div className="mt-3 rounded-xl border border-[var(--accent)]/40 bg-black/30 p-3">
          <p className="text-xs text-[var(--muted)]">
            Copy now — this plaintext is shown once.
          </p>
          <code className="mt-1 block break-all font-mono text-sm text-[var(--ink)]">
            {publicKeys.created.token}
          </code>
          <div className="mt-2 flex gap-2">
            <Button variant="secondary" size="sm" onClick={publicKeys.copy}>
              {publicKeys.copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="ghost" size="sm" onClick={publicKeys.dismissCreated}>
              Done
            </Button>
          </div>
        </div>
      ) : null}

      <ResourceStatus
        failed={publicKeys.keys.failed}
        empty={publicKeys.keys.empty}
        loading={<SkeletonListRows count={2} className="mt-3" />}
        error={
          <p className="mt-3 text-sm text-[var(--danger)]">Could not load public API keys.</p>
        }
      >
        {rows.length ? (
          <ul className="-mx-2.5 mt-3">
            {rows.map((row) => (
              <KeyRow
                key={row.id}
                row={row}
                busy={publicKeys.revoke.busy}
                onRevoke={setConfirm}
              />
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[var(--muted)]">No public API keys yet.</p>
        )}
      </ResourceStatus>
      {publicKeys.error ? (
        <p role="alert" className="mt-2 text-sm text-[var(--danger)]">
          {publicKeys.error}
        </p>
      ) : null}
      <Dialog open={confirm != null} onClose={() => setConfirm(null)} title="Revoke key?">
        <p className="text-sm text-[var(--muted)]">
          Revoke “{confirm?.label || "this key"}”? Anything still using it stops working.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirm(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={revoke}>
            Revoke key
          </Button>
        </div>
      </Dialog>
    </ProfileSection>
  );
};
