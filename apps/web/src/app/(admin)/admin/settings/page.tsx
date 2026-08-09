"use client";

import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { Button, PageHeader, Panel } from "@/components/ui";
import { api } from "@/lib/api";

type Settings = {
  signupEnabled: boolean;
  signupOpen: boolean;
  abuse: Record<string, number>;
};

export default function AdminSettingsPage() {
  const store = useStore();
  const settings = useResource({
    id: ["admin-settings"],
    load: () => api<Settings>("/admin/settings"),
  });

  const patch = useAction({
    run: (signupEnabled: boolean) =>
      api("/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ signupEnabled }),
      }),
    onSuccess: () => {
      store.touch(["admin-settings"]);
      store.touch(["admin-overview"]);
      store.touch(["signup-status"]);
    },
  });

  const s = settings.value;

  return (
    <>
      <PageHeader
        title="Settings"
        description="Control public registration and review abuse counters."
      />

      <Panel className="max-w-lg p-5">
        <h2 className="font-display text-lg font-bold">Signup</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          When no admins exist, signup is always open. After the first admin,
          this toggle applies. Currently{" "}
          <strong>{s?.signupOpen ? "open" : "closed"}</strong>
          {s ? ` (setting: ${s.signupEnabled ? "enabled" : "disabled"})` : ""}.
        </p>
        <div className="mt-4 flex gap-2">
          <Button
            disabled={patch.busy || s?.signupEnabled === true}
            onClick={() => patch.submit(true)}
          >
            Enable signup
          </Button>
          <Button
            variant="secondary"
            disabled={patch.busy || s?.signupEnabled === false}
            onClick={() => patch.submit(false)}
          >
            Disable signup
          </Button>
        </div>
      </Panel>

      <Panel className="mt-6 max-w-lg p-5">
        <h2 className="font-display text-lg font-bold">Abuse metrics</h2>
        <ul className="mt-3 space-y-1 font-mono text-xs text-[var(--muted)]">
          {s
            ? Object.entries(s.abuse).map(([k, v]) => (
                <li key={k} className="flex justify-between gap-4">
                  <span>{k}</span>
                  <span className="text-[var(--ink)]">{v}</span>
                </li>
              ))
            : null}
        </ul>
      </Panel>
    </>
  );
}
