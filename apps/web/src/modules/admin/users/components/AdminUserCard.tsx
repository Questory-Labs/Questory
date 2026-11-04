"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { ADMIN_MONO_DIM, ADMIN_ROW, ADMIN_TD } from "../../shared/admin.styles";
import { AdminMenu } from "../../shared/components/AdminMenu";
import { SYNC_ACTIONS } from "../admin.users.copy";
import type { AdminUser, ConfirmAction } from "../admin.users.types";
import {
  MODULE_KEYS,
  joinedLabel,
  syncSummary,
  userInitial,
} from "../admin.users.utils";

export type { AdminUser } from "../admin.users.types";

const PILL =
  "inline-flex min-h-[34px] items-center rounded-full px-3 text-[13px] font-normal transition hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50";

const INPUT =
  "mt-1 w-full rounded-full border border-white/[0.08] bg-black/25 px-4 py-2 text-sm text-[var(--ink)] outline-none focus:border-white/20";

type AdminUserCardProps = {
  user: AdminUser;
  startFreshEnabled: boolean;
  pending: boolean;
  editing: boolean;
  savePending?: boolean;
  onConfirm: (action: ConfirmAction) => void;
  onEdit: (editing: boolean) => void;
  onSave: (body: { email?: string; password?: string }) => void;
};

export const AdminUserCard = ({
  user,
  startFreshEnabled,
  pending,
  editing,
  savePending = false,
  onConfirm,
  onEdit,
  onSave,
}: AdminUserCardProps) => {
  const [email, setEmail] = useState(user.email || "");
  const [password, setPassword] = useState("");
  const sync = syncSummary(user);
  const modules = user.modules;
  const enabledModules = MODULE_KEYS.filter((m) => modules?.[m.key]);

  const startEdit = () => {
    setEmail(user.email || "");
    setPassword("");
    onEdit(true);
  };

  const cancelEdit = () => {
    setEmail(user.email || "");
    setPassword("");
    onEdit(false);
  };

  const moreItems = [
    {
      key: "role",
      label: user.isAdmin ? "Demote admin" : "Promote to admin",
      onSelect: () => onConfirm({ kind: "role", user, promote: !user.isAdmin }),
      disabled: pending,
    },
    { key: "password", label: "Reset password", onSelect: startEdit },
    ...(startFreshEnabled
      ? [
          {
            key: "start-fresh",
            label: "Start fresh (clear synced data)",
            onSelect: () => onConfirm({ kind: "start-fresh", user }),
            disabled: pending,
          },
        ]
      : []),
    {
      key: "delete",
      label: "Delete user…",
      onSelect: () => onConfirm({ kind: "delete", user }),
      disabled: pending,
      danger: true,
      separatorBefore: true,
    },
  ];

  return (
    <>
      <tr className={ADMIN_ROW}>
        <td className={ADMIN_TD}>
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="grid h-8 w-8 flex-none place-items-center rounded-full bg-[linear-gradient(140deg,#3a3a3f,#1b1b1e)] text-[11px] font-medium"
            >
              {userInitial(user)}
            </span>
            <span className="min-w-0">
              <span className="block font-normal">{user.personaName}</span>
              <span className={`block truncate ${ADMIN_MONO_DIM} text-[11px] text-[var(--faint)]`}>
                {user.email || "no email"}
                {user.steamId ? ` · ${user.steamId}` : " · no steam"}
              </span>
            </span>
          </div>
        </td>
        <td className={ADMIN_TD}>
          <span
            className={`inline-flex rounded-full border px-2.5 py-[3px] text-xs ${
              user.isAdmin
                ? "border-[rgba(230,194,122,0.3)] bg-[rgba(230,194,122,0.1)] text-[#f0d9a6]"
                : "border-white/10 text-[var(--muted)]"
            }`}
          >
            {user.isAdmin ? "Admin" : "User"}
          </span>
        </td>
        <td className={ADMIN_TD}>
          {modules ? (
            <span
              role="img"
              aria-label={enabledModules.map((m) => m.label).join(", ") || "None"}
              className="inline-flex gap-1.5"
            >
              {MODULE_KEYS.map((m) => (
                <span
                  key={m.key}
                  className={`grid h-[22px] w-[22px] place-items-center rounded-full border font-mono text-[10px] ${
                    modules[m.key] ? m.on : "border-white/[0.06] text-[#3a3a3f]"
                  }`}
                >
                  {m.label.charAt(0)}
                </span>
              ))}
            </span>
          ) : (
            <span className={ADMIN_MONO_DIM}>—</span>
          )}
        </td>
        <td className={ADMIN_TD}>
          <span
            className={`inline-flex items-center gap-2 font-mono text-xs ${
              sync.failed ? "text-[#ff9a9a]" : "text-[#bdbdc2]"
            }`}
          >
            <span
              aria-hidden
              className={`dot ${
                sync.failed
                  ? "q-live text-[var(--danger)] shadow-[0_0_8px_var(--danger)]"
                  : "text-[var(--ok)] shadow-[0_0_8px_var(--ok)]"
              }`}
            />
            {sync.label}
          </span>
        </td>
        <td className={`${ADMIN_TD} font-mono text-xs text-[var(--muted)]`}>
          {joinedLabel(user.createdAt)}
        </td>
        <td className="whitespace-nowrap px-3.5 py-1.5 text-right">
          <div className="inline-flex items-center gap-1">
            <AdminMenu
              trigger="Sync ▾"
              triggerLabel={`Sync ${user.personaName}`}
              title={`Sync · ${user.personaName}`}
              triggerClassName={`${PILL} border border-white/[0.12] bg-white/[0.04] text-[var(--ink)]`}
              items={SYNC_ACTIONS.map(({ target, label }) => ({
                key: target,
                label,
                disabled: pending || (target === "catalog" && !user.steamId),
                onSelect: () => onConfirm({ kind: "sync", user, target }),
              }))}
            />
            <button
              type="button"
              className={`${PILL} border border-transparent text-[var(--muted)]`}
              onClick={editing ? cancelEdit : startEdit}
            >
              {editing ? "Close" : "Edit"}
            </button>
            <AdminMenu
              trigger="⋯"
              triggerLabel={`More actions for ${user.personaName}`}
              title={`More actions · ${user.personaName}`}
              triggerClassName={`${PILL} min-w-[34px] justify-center border border-transparent text-base text-[var(--muted)]`}
              items={moreItems}
            />
          </div>
        </td>
      </tr>
      {editing ? (
        <tr className="border-t border-white/[0.05]">
          <td colSpan={6} className="px-3.5 pb-4 pt-2">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label className="text-sm">
                <span className="label-mono">Email</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={INPUT}
                />
              </label>
              <label className="text-sm">
                <span className="label-mono">New password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={10}
                  className={INPUT}
                />
              </label>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={savePending} onClick={cancelEdit}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={savePending}
                  onClick={() =>
                    onSave({ email: email || undefined, password: password || undefined })
                  }
                >
                  Save
                </Button>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
};
