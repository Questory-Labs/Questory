"use client";

import { Button, PageHeader, Panel } from "@/components/ui";
import { ResourceStatus, SkeletonListRows } from "@questorylabs/ui";
import { FEATURE_FLAG_ROWS, SOURCE_FLAG_GROUPS } from "./admin.settings.constants";
import { FlagToggle } from "./components/FlagToggle";
import type { AdminSettingsViewProps } from "./admin.settings.types";

export const AdminSettingsView = (props: Record<string, unknown>) => {
  const { settings, patch } = props as AdminSettingsViewProps;
  const s = settings.value;

  return (
    <>
      <PageHeader size="sm"
        title="Settings"
        description="Control public registration, optional Music / Watch / Read, and instance data sources."
      />

      <ResourceStatus
        failed={settings.failed}
        empty={settings.empty}
        loading={<SkeletonListRows count={4} />}
        error={
          <p className="text-sm text-[var(--warm)]">
            {(settings.error as Error)?.message}
          </p>
        }
      >
        <>
          <Panel className="max-w-2xl p-5">
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

          <Panel className="mt-6 max-w-2xl p-5">
            <h2 className="font-display text-lg font-bold">Features</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Reload the app to update navigation after changing these flags.
              API processes enforce the live value immediately.
            </p>
            <div className="mt-2">
              {FEATURE_FLAG_ROWS.map((row) => {
                const flag = s?.features[row.id];
                return (
                  <FlagToggle
                    key={row.id}
                    label={row.label}
                    hint={row.hint}
                    origin={flag?.origin ?? "default"}
                    enabled={flag?.enabled === true}
                    busy={patch.busy}
                    onToggle={() =>
                      patch.submit({
                        features: { [row.id]: !(flag?.enabled === true) },
                      })
                    }
                  />
                );
              })}
            </div>
          </Panel>

          <Panel className="mt-6 max-w-2xl p-5">
            <h2 className="font-display text-lg font-bold">Data sources</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Instance-wide vendor toggles. Disabling a source skips ingest and
              hides its settings cards; connected accounts are kept.
            </p>
            {SOURCE_FLAG_GROUPS.map((group) => (
              <div key={group.title} className="mt-5">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
                  {group.title}
                </h3>
                {group.items.map((row) => {
                  const flag = s?.sources[row.id];
                  return (
                    <FlagToggle
                      key={row.id}
                      label={row.label}
                      hint={row.hint}
                      origin={flag?.origin ?? "default"}
                      enabled={flag?.enabled === true}
                      busy={patch.busy}
                      onToggle={() =>
                        patch.submit({
                          sources: { [row.id]: !(flag?.enabled === true) },
                        })
                      }
                    />
                  );
                })}
              </div>
            ))}
          </Panel>

          <Panel className="mt-6 max-w-2xl p-5">
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
      </ResourceStatus>
    </>
  );
};
