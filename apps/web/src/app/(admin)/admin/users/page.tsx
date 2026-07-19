"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button, PageHeader, Panel } from "@/components/ui";
import { api } from "@/lib/api";

type AdminUser = {
  id: string;
  email: string | null;
  isAdmin: boolean;
  personaName: string;
  steamId: string | null;
  createdAt: string;
  lastSyncedAt: string | null;
};

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [editId, setEditId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api<{ users: AdminUser[] }>("/admin/users"),
  });

  const patch = useMutation({
    mutationFn: (body: {
      id: string;
      email?: string;
      password?: string;
      isAdmin?: boolean;
    }) =>
      api(`/admin/users/${body.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          email: body.email,
          password: body.password,
          isAdmin: body.isAdmin,
        }),
      }),
    onSuccess: () => {
      setMsg("Updated");
      setPassword("");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) =>
      api(`/admin/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setMsg("Deleted");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const sync = useMutation({
    mutationFn: (userId: string) =>
      api("/admin/ops/user-sync", {
        method: "POST",
        body: JSON.stringify({ userId }),
      }),
    onSuccess: () => setMsg("Sync enqueued"),
    onError: (e: Error) => setMsg(e.message),
  });

  const prices = useMutation({
    mutationFn: (userId: string) =>
      api("/admin/ops/refresh-prices", {
        method: "POST",
        body: JSON.stringify({ userId }),
      }),
    onSuccess: () => setMsg("Price refresh started"),
    onError: (e: Error) => setMsg(e.message),
  });

  return (
    <>
      <PageHeader
        title="Users"
        description="List accounts, reset passwords, promote admins, trigger sync."
      />
      {msg ? <p className="mb-4 text-sm text-[var(--accent)]">{msg}</p> : null}

      <div className="space-y-3">
        {(users.data?.users || []).map((u) => (
          <Panel key={u.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-medium">{u.personaName}</div>
                <div className="font-mono text-xs text-[var(--muted)]">
                  {u.email || "no email"} · {u.isAdmin ? "admin" : "user"}
                  {u.steamId ? ` · ${u.steamId}` : " · no steam"}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  className="px-2 py-1 text-xs"
                  onClick={() => {
                    setEditId(u.id);
                    setEmail(u.email || "");
                    setPassword("");
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  className="px-2 py-1 text-xs"
                  onClick={() =>
                    patch.mutate({ id: u.id, isAdmin: !u.isAdmin })
                  }
                >
                  {u.isAdmin ? "Demote" : "Make admin"}
                </Button>
                <Button
                  variant="secondary"
                  className="px-2 py-1 text-xs"
                  disabled={!u.steamId}
                  onClick={() => sync.mutate(u.id)}
                >
                  Sync
                </Button>
                <Button
                  variant="secondary"
                  className="px-2 py-1 text-xs"
                  onClick={() => prices.mutate(u.id)}
                >
                  Prices
                </Button>
                <Button
                  variant="ghost"
                  className="px-2 py-1 text-xs text-[var(--warm)]"
                  onClick={() => {
                    if (confirm(`Delete ${u.email || u.personaName}?`)) {
                      del.mutate(u.id);
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>

            {editId === u.id ? (
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
                <div className="sm:col-span-2">
                  <Button
                    onClick={() =>
                      patch.mutate({
                        id: u.id,
                        email: email || undefined,
                        password: password || undefined,
                      })
                    }
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : null}
          </Panel>
        ))}
      </div>
    </>
  );
}
