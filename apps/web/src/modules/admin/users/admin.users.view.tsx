"use client";

import { Button, PageHeader } from "@/components/ui";
import {
  ResourceStatus,
  SkeletonListRows,
} from "@questorylabs/ui";
import { AdminAddUserDialog } from "./components/AdminAddUserDialog";
import { AdminUserCard } from "./components/AdminUserCard";
import type { AdminUsersViewProps } from "./admin.users.types";

export const AdminUsersView = (props: Record<string, unknown>) => {
  const { users, msg, setMsg, addOpen, setAddOpen } =
    props as AdminUsersViewProps;
  const startFreshEnabled = users.value?.startFreshEnabled === true;

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
        <div className="space-y-3">
          {(users.value?.users || []).map((user) => (
            <AdminUserCard
              key={user.id}
              user={user}
              startFreshEnabled={startFreshEnabled}
              onMessage={setMsg}
            />
          ))}
        </div>
      </ResourceStatus>

      <AdminAddUserDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onMessage={setMsg}
      />
    </>
  );
};
