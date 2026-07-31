"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AdminAddUserDialog } from "@/components/admin/AdminAddUserDialog";
import { AdminUserCard } from "@/components/admin/AdminUserCard";
import { Button, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";

type AdminUsersResponse = {
  users: Array<{
    id: string;
    email: string | null;
    isAdmin: boolean;
    personaName: string;
    steamId: string | null;
    createdAt: string;
    lastSyncedAt: string | null;
  }>;
  startFreshEnabled?: boolean;
};

export default function AdminUsersPage() {
  const [msg, setMsg] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api<AdminUsersResponse>("/admin/users"),
  });
  const startFreshEnabled = users.data?.startFreshEnabled === true;

  return (
    <>
      <PageHeader
        title="Users"
        description={
          startFreshEnabled
            ? "List accounts, reset passwords, start fresh, promote admins, trigger sync."
            : "List accounts, reset passwords, promote admins, trigger sync."
        }
        actions={
          <Button variant="secondary" onClick={() => setAddOpen(true)}>
            Add user
          </Button>
        }
      />
      {msg ? <p className="mb-4 text-sm text-[var(--accent)]">{msg}</p> : null}

      <div className="space-y-3">
        {(users.data?.users || []).map((user) => (
          <AdminUserCard
            key={user.id}
            user={user}
            startFreshEnabled={startFreshEnabled}
            onMessage={setMsg}
          />
        ))}
      </div>

      <AdminAddUserDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onMessage={setMsg}
      />
    </>
  );
}
