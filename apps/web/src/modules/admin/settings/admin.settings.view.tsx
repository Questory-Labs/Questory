"use client";

import { ResourceStatus, SkeletonListRows } from "@questorylabs/ui";
import { ABUSE_LABELS } from "../home/admin.home.utils";
import { ADMIN_SECTION_TITLE } from "../shared/admin.styles";
import { FEATURE_FLAG_ROWS, SOURCE_FLAG_GROUPS } from "./admin.settings.constants";
import { limitLabel, windowLabel } from "./admin.settings.utils";
import { FlagToggle } from "./components/FlagToggle";
import type { AdminSettingsViewProps } from "./admin.settings.types";

const LIST_ROW =
  "flex items-baseline justify-between gap-4 border-t border-white/[0.05] py-2.5 text-sm first:border-t-0";

export const AdminSettingsView = (props: Record<string, unknown>) => {
  const { settings, patch } = props as AdminSettingsViewProps;
  const s = settings.value;
  const signupOn = s?.signupEnabled === true;

  return (
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
      <div className="grid gap-3.5 lg:grid-cols-2">
        <div className="flex flex-col gap-3.5">
          <section className="panel q-in p-5 [--i:1]" aria-labelledby="admin-access-title">
            <h2 id="admin-access-title" className={ADMIN_SECTION_TITLE}>
              Access and modules
            </h2>
            <p className="mt-1 text-xs font-light text-[var(--muted)]">
              Reload the app to update navigation after changing these flags.
              API processes enforce the live value immediately.
            </p>
            <div className="mt-2">
              <FlagToggle
                label="Open signup"
                hint={`Anyone with the URL can create an account. With no admins, signup is always open. Currently ${
                  s?.signupOpen ? "open" : "closed"
                }.`}
                enabled={signupOn}
                busy={patch.busy}
                dotClassName="text-[var(--faint)]"
                onToggle={() => patch.submit({ signupEnabled: !signupOn })}
              />
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
                    dotClassName={row.dot}
                    onToggle={() =>
                      patch.submit({
                        features: { [row.id]: !(flag?.enabled === true) },
                      })
                    }
                  />
                );
              })}
            </div>
          </section>

          <section className="panel q-in p-5 [--i:3]" aria-labelledby="admin-limits-title">
            <h2 id="admin-limits-title" className={ADMIN_SECTION_TITLE}>
              Abuse limits
            </h2>
            <p className="mt-1 text-xs font-light text-[var(--muted)]">
              Built into the API. Read only.
            </p>
            <ul className="mt-3">
              {(s?.limits ?? []).map((limit) => (
                <li key={limit.key} className={LIST_ROW}>
                  <span className="font-light text-[var(--muted)]">{limitLabel(limit.key)}</span>
                  <span className="font-mono text-xs text-[var(--ink)]">
                    {limit.max} / {windowLabel(limit.windowSeconds)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel q-in p-5 [--i:4]" aria-labelledby="admin-abuse-title">
            <h2 id="admin-abuse-title" className={ADMIN_SECTION_TITLE}>
              Abuse metrics
            </h2>
            <p className="mt-1 text-xs font-light text-[var(--muted)]">
              Counted since the API last restarted.
            </p>
            <ul className="mt-3">
              {Object.entries(s?.abuse ?? {}).map(([k, v]) => (
                <li key={k} className={LIST_ROW}>
                  <span className="font-light text-[var(--muted)]">{ABUSE_LABELS[k] ?? k}</span>
                  <span className="font-mono text-xs text-[var(--ink)]">{v}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="panel q-in p-5 [--i:2]" aria-labelledby="admin-sources-title">
          <h2 id="admin-sources-title" className={ADMIN_SECTION_TITLE}>
            Data sources
          </h2>
          <p className="mt-1 text-xs font-light text-[var(--muted)]">
            Instance-wide vendor toggles. Disabling a source skips ingest and
            hides its settings cards; connected accounts are kept.
          </p>
          {SOURCE_FLAG_GROUPS.map((group) => (
            <div key={group.title} className="mt-5">
              <h3 className="label-mono flex items-center gap-2">
                <span className={`dot h-1.5 w-1.5 ${group.dot}`} aria-hidden />
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
        </section>
      </div>
    </ResourceStatus>
  );
};
