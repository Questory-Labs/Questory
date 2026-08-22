"use client";

import { useAction, useStore } from "@questorylabs/qhttp/react";
import { useState } from "react";
import { Button, Dialog, Panel } from "@/components/ui";
import { api } from "@/lib/api";

export type AdminUser = {
  id: string;
  email: string | null;
  isAdmin: boolean;
  personaName: string;
  steamId: string | null;
  createdAt: string;
  lastSyncedAt: string | null;
};

type SyncTarget = "music" | "movie" | "read" | "catalog" | "price";

type ConfirmAction =
  | { kind: "role"; user: AdminUser; promote: boolean }
  | { kind: "delete"; user: AdminUser }
  | { kind: "sync"; user: AdminUser; target: SyncTarget }
  | { kind: "start-fresh"; user: AdminUser };

const SYNC_ACTIONS: Array<{ target: SyncTarget; label: string }> = [
  { target: "music", label: "Sync music" },
  { target: "movie", label: "Sync movie" },
  { target: "read", label: "Sync read" },
  { target: "catalog", label: "Sync catalog" },
  { target: "price", label: "Sync price" },
];

const userLabel = (user: AdminUser) => user.email || user.personaName;

const syncDialogCopy = (target: SyncTarget, user: AdminUser) => {
  const name = userLabel(user);
  switch (target) {
    case "music":
      return {
        title: "Sync music?",
        body: `Queue metadata enrichment for tracks listened by ${name}. This does not pull new scrobbles from external services.`,
      };
    case "movie":
      return {
        title: "Sync movie?",
        body: `Re-sync connected watch providers (Trakt, Letterboxd, anime lists) for ${name}. Skips providers that are not connected.`,
      };
    case "read":
      return {
        title: "Sync read?",
        body: `Re-sync connected manga/list providers for ${name}. Skips providers that are not connected.`,
      };
    case "catalog":
      return {
        title: "Sync catalog?",
        body: `Enqueue a full Steam library, wishlist, friends, and metadata refresh for ${name}. Requires a linked Steam account.`,
      };
    case "price":
      return {
        title: "Sync price?",
        body: `Refresh regional prices for ${name}'s library and wishlist.`,
      };
  }
};

type AdminUserCardProps = {
  user: AdminUser;
  startFreshEnabled: boolean;
  onMessage: (message: string) => void;
};

export const AdminUserCard = ({
  user,
  startFreshEnabled,
  onMessage,
}: AdminUserCardProps) => {
  const store = useStore();
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(user.email || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);

  const patch = useAction({
    run: (body: {
      email?: string;
      password?: string;
      isAdmin?: boolean;
    }) =>
      api(`/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      onMessage("Updated");
      setPassword("");
      setEditing(false);
      store.touch(["admin-users"]);
    },
    onError: (e: Error) => onMessage(e.message),
  });

  const del = useAction({
    run: () => api(`/admin/users/${user.id}`, { method: "DELETE" }),
    onSuccess: () => {
      onMessage("Deleted");
      store.touch(["admin-users"]);
    },
    onError: (e: Error) => onMessage(e.message),
  });

  const resetData = useAction({
    run: () =>
      api(`/admin/users/${user.id}/reset-data`, { method: "POST" }),
    onSuccess: () => {
      onMessage("Started fresh — user kept, all other data wiped");
      store.touch(["admin-users"]);
    },
    onError: (e: Error) => onMessage(e.message),
  });

  const syncTarget = useAction({
    run: (target: SyncTarget) =>
      api("/admin/ops/user-sync-target", {
        method: "POST",
        body: JSON.stringify({ userId: user.id, target }),
      }),
    onSuccess: (_data, target) => {
      onMessage(`Sync ${target} started`);
    },
    onError: (e: Error) => onMessage(e.message),
  });

  const startEdit = () => {
    setEmail(user.email || "");
    setPassword("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setEmail(user.email || "");
    setPassword("");
    setEditing(false);
  };

  const saveEdit = () => {
    patch.submit({
      email: email || undefined,
      password: password || undefined,
    });
  };

  const handleConfirm = () => {
    if (!confirm) return;

    if (confirm.kind === "role") {
      patch.submit({ isAdmin: confirm.promote });
    } else if (confirm.kind === "delete") {
      del.submit();
    } else if (confirm.kind === "sync") {
      syncTarget.submit(confirm.target);
    } else if (confirm.kind === "start-fresh") {
      resetData.submit();
    }

    setConfirm(null);
  };

  const pending =
    patch.busy ||
    del.busy ||
    resetData.busy ||
    syncTarget.busy;

  const dialog = (() => {
    if (!confirm) return null;

    if (confirm.kind === "role") {
      const promote = confirm.promote;
      return {
        title: promote ? "Promote to admin?" : "Demote admin?",
        body: promote
          ? `Grant admin access to ${userLabel(confirm.user)}? They will be able to use the admin console.`
          : `Remove admin access from ${userLabel(confirm.user)}?`,
        confirmLabel: promote ? "Promote" : "Demote",
        destructive: !promote,
      };
    }

    if (confirm.kind === "delete") {
      return {
        title: "Delete user?",
        body: `Permanently delete ${userLabel(confirm.user)} and all associated data. This cannot be undone.`,
        confirmLabel: "Delete",
        destructive: true,
      };
    }

    if (confirm.kind === "start-fresh") {
      return {
        title: "Start fresh?",
        body: `Wipe library, wishlist, friends, family, collections, music, watch, API keys, and sync history for ${userLabel(confirm.user)} while keeping the account and Steam link.`,
        confirmLabel: "Start fresh",
        destructive: true,
      };
    }

    const copy = syncDialogCopy(confirm.target, confirm.user);
    return {
      title: copy.title,
      body: copy.body,
      confirmLabel: "Sync",
      destructive: false,
    };
  })();

  return (
    <>
      <Panel className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-medium">{user.personaName}</div>
            <div className="font-mono text-xs text-[var(--muted)]">
              {user.email || "no email"} · {user.isAdmin ? "admin" : "user"}
              {user.steamId ? ` · ${user.steamId}` : " · no steam"}
            </div>

            <div className="mt-2 font-mono text-xs">
              {SYNC_ACTIONS.map(({ target, label }, index) => (
                <span key={target}>
                  {index > 0 ? (
                    <span className="text-[var(--muted)]"> · </span>
                  ) : null}
                  <button
                    type="button"
                    className="text-[var(--accent)] hover:text-[var(--ink)] hover:underline disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                    disabled={
                      pending || (target === "catalog" && !user.steamId)
                    }
                    onClick={() =>
                      setConfirm({ kind: "sync", user, target })
                    }
                  >
                    {label}
                  </button>
                </span>
              ))}
              {startFreshEnabled ? (
                <span>
                  <span className="text-[var(--muted)]"> · </span>
                  <button
                    type="button"
                    className="text-[var(--danger)] hover:text-[var(--ink)] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={pending}
                    onClick={() =>
                      setConfirm({ kind: "start-fresh", user })
                    }
                  >
                    Start fresh
                  </button>
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {editing ? (
              <>
                <Button
                  variant="secondary"
                  className="px-2 py-1 text-xs"
                  disabled={patch.busy}
                  onClick={cancelEdit}
                >
                  Cancel
                </Button>
                <Button
                  className="px-2 py-1 text-xs"
                  disabled={patch.busy}
                  onClick={saveEdit}
                >
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  className="px-2 py-1 text-xs"
                  onClick={startEdit}
                >
                  Edit
                </Button>
                <Button
                  variant={user.isAdmin ? "ghost-danger" : "secondary"}
                  className="px-2 py-1 text-xs"
                  disabled={pending}
                  onClick={() =>
                    setConfirm({
                      kind: "role",
                      user,
                      promote: !user.isAdmin,
                    })
                  }
                >
                  {user.isAdmin ? "Demote" : "Promote"}
                </Button>
                <Button
                  variant="ghost-danger"
                  className="px-2 py-1 text-xs"
                  disabled={pending}
                  onClick={() => setConfirm({ kind: "delete", user })}
                >
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>

        {editing ? (
          <div className="mt-4 grid gap-2 border-t border-[var(--line)] pt-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-[var(--muted)]">Email</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full border border-[var(--line)] bg-[var(--bg-1)] px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="text-[var(--muted)]">New password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={10}
                className="mt-1 w-full border border-[var(--line)] bg-[var(--bg-1)] px-2 py-1.5 text-sm"
              />
            </label>
          </div>
        ) : null}
      </Panel>

      <Dialog
        open={dialog != null}
        onClose={() => setConfirm(null)}
        title={dialog?.title ?? ""}
      >
        <p className="text-sm text-[var(--muted)]">{dialog?.body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirm(null)}>
            Cancel
          </Button>
          <Button
            variant={dialog?.destructive ? "danger" : "primary"}
            onClick={handleConfirm}
            disabled={pending}
          >
            {dialog?.confirmLabel ?? "Confirm"}
          </Button>
        </div>
      </Dialog>
    </>
  );
};
