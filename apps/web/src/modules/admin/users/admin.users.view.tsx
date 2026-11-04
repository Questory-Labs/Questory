"use client";

import { useState } from "react";
import { Button, PageHeader } from "@/components/ui";
import { ResourceStatus, SkeletonListRows } from "@questorylabs/ui";
import { AdminAddUserDialog } from "./components/AdminAddUserDialog";
import { AdminUsersTable } from "./components/AdminUsersTable";
import { filterUsers } from "./admin.users.utils";
import type { AdminUsersViewProps } from "./admin.users.types";

export const AdminUsersView = (props: Record<string, unknown>) => {
  const { users, msg, setMsg, addOpen, setAddOpen } =
    props as AdminUsersViewProps;
  const [query, setQuery] = useState("");
  const list = users.value?.users ?? [];
  const startFreshEnabled = users.value?.startFreshEnabled === true;
  const admins = list.filter((u) => u.isAdmin).length;
  const failing = users.value?.failingSyncCount ?? 0;
  const visible = filterUsers(list, query);

  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader
        eyebrow={users.value ? `${admins} ${admins === 1 ? "admin" : "admins"}` : "Users"}
        title={
          <>
            {users.value ? list.length : "—"} users,{" "}
            <span className="font-serif text-[var(--muted)]">
              {users.value
                ? failing
                  ? `${failing} out of sync`
                  : "all in sync"
                : "loading"}
            </span>
          </>
        }
        description={
          startFreshEnabled
            ? "Reset passwords, start fresh, promote admins and trigger syncs."
            : "Reset passwords, promote admins and trigger syncs."
        }
        actions={
          <Button onClick={() => setAddOpen(true)}>Add user</Button>
        }
      />
      {msg ? <p className="text-sm text-[var(--accent)]">{msg}</p> : null}

      <label className="q-in flex min-h-11 max-w-[420px] items-center gap-2.5 rounded-full border border-white/[0.08] bg-black/25 px-4 text-[var(--muted)] [--i:1]">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <span className="sr-only">Search users</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email or name"
          className="min-w-0 flex-1 border-0 bg-transparent text-sm font-light text-[var(--ink)] outline-none"
        />
      </label>

      <ResourceStatus
        failed={users.failed}
        empty={users.empty}
        loading={<SkeletonListRows />}
        error={
          <p className="text-sm text-[var(--warm)]">
            {(users.error as Error)?.message}
          </p>
        }
      >
        {visible.length ? (
          <AdminUsersTable
            users={visible}
            startFreshEnabled={startFreshEnabled}
            onMessage={setMsg}
          />
        ) : (
          <p className="px-1 text-sm text-[var(--muted)]">No users match “{query}”.</p>
        )}
      </ResourceStatus>

      <AdminAddUserDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onMessage={setMsg}
      />
    </div>
  );
};
