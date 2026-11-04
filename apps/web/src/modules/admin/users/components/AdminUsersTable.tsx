"use client";

import { useAction, useStore } from "@questorylabs/qhttp/react";
import { useState } from "react";
import { Button, Dialog } from "@/components/ui";
import { api } from "@/lib/api";
import { ADMIN_TABLE, ADMIN_TABLE_WRAP, ADMIN_TH } from "../../shared/admin.styles";
import { confirmDialogCopy } from "../admin.users.copy";
import type { AdminUser, ConfirmAction, SyncTarget } from "../admin.users.types";
import { AdminUserCard } from "./AdminUserCard";

type PatchBody = { email?: string; password?: string; isAdmin?: boolean };

export const AdminUsersTable = ({
  users,
  startFreshEnabled,
  onMessage,
}: {
  users: AdminUser[];
  startFreshEnabled: boolean;
  onMessage: (message: string) => void;
}) => {
  const store = useStore();
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const touch = () => store.touch(["admin-users"]);

  const patch = useAction({
    run: ({ id, body }: { id: string; body: PatchBody }) =>
      api(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      onMessage("Updated");
      setEditingId(null);
      touch();
    },
    onError: (e: Error) => onMessage(e.message),
  });

  const del = useAction({
    run: (id: string) => api(`/admin/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      onMessage("Deleted");
      touch();
    },
    onError: (e: Error) => onMessage(e.message),
  });

  const resetData = useAction({
    run: (id: string) => api(`/admin/users/${id}/reset-data`, { method: "POST" }),
    onSuccess: () => {
      onMessage("Started fresh — user kept, all other data wiped");
      touch();
    },
    onError: (e: Error) => onMessage(e.message),
  });

  const syncTarget = useAction({
    run: ({ id, target }: { id: string; target: SyncTarget }) =>
      api("/admin/ops/user-sync-target", {
        method: "POST",
        body: JSON.stringify({ userId: id, target }),
      }),
    onSuccess: (_data, { target }) => onMessage(`Sync ${target} started`),
    onError: (e: Error) => onMessage(e.message),
  });

  const pending = patch.busy || del.busy || resetData.busy || syncTarget.busy;

  const handleConfirm = () => {
    if (!confirm) return;
    const id = confirm.user.id;
    if (confirm.kind === "role") patch.submit({ id, body: { isAdmin: confirm.promote } });
    else if (confirm.kind === "delete") del.submit(id);
    else if (confirm.kind === "sync") syncTarget.submit({ id, target: confirm.target });
    else resetData.submit(id);
    setConfirm(null);
  };

  const dialog = confirm ? confirmDialogCopy(confirm) : null;

  return (
    <>
      <div className={`${ADMIN_TABLE_WRAP} [--i:2]`}>
        <table className={`${ADMIN_TABLE} min-w-[860px]`}>
          <thead>
            <tr>
              <th scope="col" className={ADMIN_TH}>User</th>
              <th scope="col" className={ADMIN_TH}>Role</th>
              <th scope="col" className={ADMIN_TH}>Modules</th>
              <th scope="col" className={ADMIN_TH}>Last sync</th>
              <th scope="col" className={ADMIN_TH}>Joined</th>
              <th scope="col" className={ADMIN_TH}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <AdminUserCard
                key={user.id}
                user={user}
                startFreshEnabled={startFreshEnabled}
                pending={pending}
                editing={editingId === user.id}
                savePending={patch.busy}
                onConfirm={setConfirm}
                onEdit={(on) => setEditingId(on ? user.id : null)}
                onSave={(body) => patch.submit({ id: user.id, body })}
              />
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialog != null} onClose={() => setConfirm(null)} title={dialog?.title ?? ""}>
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
