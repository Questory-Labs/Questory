"use client";

import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { Button, PageHeader, Panel } from "@/components/ui";
import { api } from "@/lib/api";

type Settings = {
  signupEnabled: boolean;
  signupOpen: boolean;
  requireEmailVerification: boolean;
  mail: { configured: boolean; enabled: boolean };
  features: { recommendations: boolean; rewindAi: boolean };
  abuse: Record<string, number>;
};

export default function AdminSettingsPage() {
  const store = useStore();
  const settings = useResource({
    id: ["admin-settings"],
    load: () => api<Settings>("/admin/settings"),
  });

  const patch = useAction({
    run: (body: Record<string, unknown>) =>
      api("/admin/settings", {
        method: "PATCH",
        body: JSON.stringify(body),
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
        description="Control public registration, mail, and paid features."
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
            onClick={() => patch.submit({ signupEnabled: true })}
          >
            Enable signup
          </Button>
          <Button
            variant="secondary"
            disabled={patch.busy || s?.signupEnabled === false}
            onClick={() => patch.submit({ signupEnabled: false })}
          >
            Disable signup
          </Button>
        </div>
      </Panel>

      <Panel className="mt-6 max-w-lg p-5">
        <h2 className="font-display text-lg font-bold">Mail</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          SMTP is{" "}
          <strong>
            {s?.mail.enabled
              ? "active"
              : s?.mail.configured
                ? "configured but disabled"
                : "not configured"}
          </strong>
          . Set SMTP_* env vars and SMTP_ENABLED=true to send verification and
          magic-link mail.
        </p>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Require email verification:{" "}
          <strong>{s?.requireEmailVerification ? "on" : "off"}</strong>
          {s && !s.mail.enabled ? " (inactive until mail is on)" : ""}.
        </p>
        <div className="mt-4 flex gap-2">
          <Button
            disabled={
              patch.busy || !s?.mail.enabled || s.requireEmailVerification
            }
            onClick={() => patch.submit({ requireEmailVerification: true })}
          >
            Require verification
          </Button>
          <Button
            variant="secondary"
            disabled={
              patch.busy || !s?.mail.enabled || s?.requireEmailVerification === false
            }
            onClick={() => patch.submit({ requireEmailVerification: false })}
          >
            Don’t require
          </Button>
        </div>
      </Panel>

      <Panel className="mt-6 max-w-lg p-5">
        <h2 className="font-display text-lg font-bold">Paid features</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Instance kill-switches. Cloud still needs a per-user grant. Self-host
          with QEngine serves these to everyone when the switch is on.
        </p>
        <div className="mt-4 space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={s?.features.recommendations === true}
              disabled={patch.busy || !s}
              onChange={(e) =>
                patch.submit({
                  features: { recommendations: e.target.checked },
                })
              }
            />
            Recommendations
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={s?.features.rewindAi === true}
              disabled={patch.busy || !s}
              onChange={(e) =>
                patch.submit({ features: { rewindAi: e.target.checked } })
              }
            />
            Rewind AI
          </label>
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
