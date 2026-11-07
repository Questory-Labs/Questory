"use client";

import { useState, type FormEvent } from "react";
import { Button, Dialog, ResourceStatus, SkeletonListRows } from "@questorylabs/ui";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_LABELS,
  type NotificationChannel,
  type NotificationChannelCreate,
  type NotificationChannelKind,
  type NotificationType,
} from "@questorylabs/shared";
import { formatDateTime } from "@/lib/dates";
import { ProfileSection } from "../settings-profile/components/ProfileSection";
import { PROFILE_INPUT_CLASS } from "../settings-profile/steam.settings-profile.constants";
import type { NotificationChannelsState } from "./steam.settings-notifications.types";

const KIND_LABEL: Record<NotificationChannelKind, string> = {
  discord: "Discord",
  ntfy: "ntfy",
  email: "Email",
};

const typesSummary = (types: NotificationChannel["types"]) =>
  types.includes("*")
    ? "All notifications"
    : types.map((t) => NOTIFICATION_TYPE_LABELS[t as NotificationType]).join(", ");

const Switch = ({
  on,
  disabled,
  label,
  onToggle,
}: {
  on: boolean;
  disabled: boolean;
  label: string;
  onToggle: () => void;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    disabled={disabled}
    onClick={onToggle}
    className={`relative h-[26px] w-[46px] flex-none rounded-full border p-0 transition-[background-color,border-color] duration-500 disabled:cursor-not-allowed disabled:opacity-60 ${
      on ? "border-[var(--ok)]/50 bg-[var(--ok)]/20" : "border-white/[0.12] bg-white/[0.06]"
    }`}
  >
    <span
      aria-hidden="true"
      className={`absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full transition-transform duration-500 ${
        on ? "translate-x-[20px] bg-[var(--ink)]" : "bg-[var(--muted)]"
      }`}
    />
  </button>
);

const ChannelRow = ({
  channel,
  state,
  onDelete,
}: {
  channel: NotificationChannel;
  state: NotificationChannelsState;
  onDelete: (c: NotificationChannel) => void;
}) => {
  const testing = state.test.busy && state.test.input === channel.id;
  const result = state.testResult?.id === channel.id ? state.testResult : null;
  const resending = state.resend.busy && state.resend.input === channel.id;
  const resent = state.resendResult?.id === channel.id ? state.resendResult : null;
  const name = channel.label || KIND_LABEL[channel.kind];
  return (
    <li className="rounded-2xl px-2.5 py-3 transition-colors duration-300 hover:bg-white/[0.03]">
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full ${channel.enabled ? "bg-[var(--ok)]" : "bg-[var(--faint)]"}`}
        />
        <span className="min-w-0 flex-[1_1_200px]">
          <span className="block font-normal">
            {name}
            <span className="ml-2 text-xs text-[var(--faint)]">{KIND_LABEL[channel.kind]}</span>
          </span>
          <code className="font-mono text-xs text-[var(--muted)]">{channel.target}</code>
        </span>
        {channel.verified ? (
          <Button
            variant="secondary"
            size="sm"
            aria-label={`Send test to ${name}`}
            disabled={testing || !channel.enabled}
            onClick={() => state.test.submit(channel.id)}
          >
            {testing ? "Sending…" : "Test"}
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            aria-label={`Resend confirmation link to ${name}`}
            disabled={resending}
            onClick={() => state.resend.submit(channel.id)}
          >
            {resending ? "Sending…" : "Resend link"}
          </Button>
        )}
        <Switch
          on={channel.enabled}
          disabled={state.update.busy}
          label={`${channel.enabled ? "Disable" : "Enable"} ${name}`}
          onToggle={() =>
            state.update.submit({ id: channel.id, patch: { enabled: !channel.enabled } })
          }
        />
        <Button
          variant="ghost-danger"
          size="sm"
          aria-label={`Remove ${name}`}
          disabled={state.remove.busy}
          onClick={() => onDelete(channel)}
        >
          Remove
        </Button>
      </div>
      <div className="mt-1.5 pl-5">
        <p className="text-xs text-[var(--muted)]">{typesSummary(channel.types)}</p>
        <p className="mt-1 text-[11px] text-[var(--faint)]">
          {channel.lastSentAt ? `last sent ${formatDateTime(channel.lastSentAt)}` : "never sent"}
        </p>
        {!channel.verified ? (
          <p role="status" className="mt-1 text-xs text-[var(--muted)]">
            {resent && !resent.ok
              ? `Could not send the confirmation link: ${resent.error ?? "unknown error"}`
              : resent
                ? "Confirmation link sent. Check your inbox."
                : "Awaiting confirmation. Open the link we emailed to start receiving notifications."}
          </p>
        ) : null}
        {result ? (
          <p
            role="status"
            className={`mt-1 text-xs ${result.ok ? "text-[var(--ok)]" : "text-[var(--danger)]"}`}
          >
            {result.ok ? "Test delivered." : `Test failed: ${result.error ?? "unknown error"}`}
          </p>
        ) : channel.lastError ? (
          <p className="mt-1 text-xs text-[var(--danger)]">Last error: {channel.lastError}</p>
        ) : null}
      </div>
    </li>
  );
};

type Draft = {
  kind: NotificationChannelKind;
  label: string;
  webhookUrl: string;
  server: string;
  topic: string;
  token: string;
  address: string;
  types: NotificationType[];
};

const emptyDraft = (kind: NotificationChannelKind): Draft => ({
  kind,
  label: "",
  webhookUrl: "",
  server: "https://ntfy.sh",
  topic: "",
  token: "",
  address: "",
  types: [...NOTIFICATION_TYPES],
});

const toCreateBody = (d: Draft): NotificationChannelCreate => {
  const types: NotificationChannelCreate["types"] =
    d.types.length === NOTIFICATION_TYPES.length ? ["*"] : d.types;
  const base = { label: d.label.trim() || null, types };
  if (d.kind === "discord") {
    return { ...base, kind: "discord", config: { webhookUrl: d.webhookUrl.trim() } };
  }
  if (d.kind === "ntfy") {
    return {
      ...base,
      kind: "ntfy",
      config: {
        server: d.server.trim() || "https://ntfy.sh",
        topic: d.topic.trim(),
        ...(d.token.trim() ? { token: d.token.trim() } : {}),
      },
    };
  }
  return { ...base, kind: "email", config: { address: d.address.trim() } };
};

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <label className="label-mono flex flex-col gap-1.5 text-[10px]">
    <span>{label}</span>
    {children}
  </label>
);

const AddChannelDialog = ({
  open,
  kinds,
  state,
  onClose,
}: {
  open: boolean;
  kinds: NotificationChannelKind[];
  state: NotificationChannelsState;
  onClose: () => void;
}) => {
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(kinds[0] ?? "discord"));
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const toggleType = (t: NotificationType) =>
    set({
      types: draft.types.includes(t) ? draft.types.filter((x) => x !== t) : [...draft.types, t],
    });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (draft.types.length === 0) return;
    try {
      await state.create.submitAsync(toCreateBody(draft));
      setDraft(emptyDraft(draft.kind));
      onClose();
    } catch {}
  };
  return (
    <Dialog open={open} onClose={onClose} title="Add delivery channel">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Channel">
          <span className="relative">
            <select
              value={draft.kind}
              onChange={(e) => setDraft(emptyDraft(e.target.value as NotificationChannelKind))}
              className={`${PROFILE_INPUT_CLASS} cursor-pointer appearance-none [&>option]:bg-[#151517]`}
            >
              {kinds.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </span>
        </Field>
        {draft.kind === "discord" ? (
          <Field label="Webhook URL">
            <input
              required
              type="url"
              placeholder="https://discord.com/api/webhooks/…"
              value={draft.webhookUrl}
              onChange={(e) => set({ webhookUrl: e.target.value })}
              className={PROFILE_INPUT_CLASS}
            />
          </Field>
        ) : null}
        {draft.kind === "ntfy" ? (
          <>
            <Field label="Topic">
              <input
                required
                placeholder="questory-alerts"
                value={draft.topic}
                onChange={(e) => set({ topic: e.target.value })}
                className={PROFILE_INPUT_CLASS}
              />
            </Field>
            <Field label="Server">
              <input
                type="url"
                value={draft.server}
                onChange={(e) => set({ server: e.target.value })}
                className={PROFILE_INPUT_CLASS}
              />
            </Field>
            <Field label="Access token (optional)">
              <input
                type="password"
                autoComplete="off"
                value={draft.token}
                onChange={(e) => set({ token: e.target.value })}
                className={PROFILE_INPUT_CLASS}
              />
            </Field>
          </>
        ) : null}
        {draft.kind === "email" ? (
          <Field label="Email address">
            <input
              required
              type="email"
              value={draft.address}
              onChange={(e) => set({ address: e.target.value })}
              className={PROFILE_INPUT_CLASS}
            />
          </Field>
        ) : null}
        <Field label="Label (optional)">
          <input
            maxLength={80}
            value={draft.label}
            onChange={(e) => set({ label: e.target.value })}
            className={PROFILE_INPUT_CLASS}
          />
        </Field>
        <fieldset className="mt-1">
          <legend className="label-mono text-[10px]">Send</legend>
          <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
            {NOTIFICATION_TYPES.map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm text-[var(--muted)]">
                <input
                  type="checkbox"
                  checked={draft.types.includes(t)}
                  onChange={() => toggleType(t)}
                />
                {NOTIFICATION_TYPE_LABELS[t]}
              </label>
            ))}
          </div>
        </fieldset>
        {state.error ? (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {state.error}
          </p>
        ) : null}
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={state.create.busy || draft.types.length === 0}>
            {state.create.busy ? "Adding…" : "Add channel"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export const NotificationChannelsSection = ({ state }: { state: NotificationChannelsState }) => {
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<NotificationChannel | null>(null);
  const list = state.channels.value;
  const kinds = list?.availableKinds ?? [];
  const items = list?.items ?? [];
  return (
    <ProfileSection
      id="profile-delivery"
      index={4}
      title="Delivery channels"
      description="Forward notifications to Discord, ntfy or email. Each channel chooses which kinds it receives."
      className="pb-3"
    >
      <ResourceStatus
        failed={state.channels.failed}
        empty={state.channels.empty}
        loading={<SkeletonListRows count={2} className="mt-3" />}
        error={
          <p className="mt-3 text-sm text-[var(--danger)]">Could not load delivery channels.</p>
        }
      >
        {items.length ? (
          <ul className="-mx-2.5 mt-3">
            {items.map((c) => (
              <ChannelRow key={c.id} channel={c} state={state} onDelete={setConfirm} />
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[var(--muted)]">
            No channels yet. Notifications still show up in the app.
          </p>
        )}
        <div className="mt-3">
          <Button
            variant="secondary"
            size="sm"
            disabled={kinds.length === 0}
            onClick={() => {
              state.clearError();
              setAdding(true);
            }}
          >
            Add channel
          </Button>
        </div>
      </ResourceStatus>
      {state.error && !adding ? (
        <p role="alert" className="mt-2 text-sm text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}
      {kinds.length ? (
        <AddChannelDialog
          key={kinds.join(",")}
          open={adding}
          kinds={kinds}
          state={state}
          onClose={() => setAdding(false)}
        />
      ) : null}
      <Dialog open={confirm != null} onClose={() => setConfirm(null)} title="Remove channel?">
        <p className="text-sm text-[var(--muted)]">
          {confirm
            ? `Remove ${confirm.label || KIND_LABEL[confirm.kind]} (${confirm.target})? Notifications stop going there immediately.`
            : ""}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirm(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (confirm) state.remove.submit(confirm.id);
              setConfirm(null);
            }}
          >
            Remove channel
          </Button>
        </div>
      </Dialog>
    </ProfileSection>
  );
};
