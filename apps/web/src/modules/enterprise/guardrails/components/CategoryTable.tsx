"use client";

import type { UseResourceResult } from "@questorylabs/qhttp/react";
import { ResourceStatus } from "@questorylabs/ui";
import type { GuardrailSettings } from "@/lib/enterprise-api";
import {
  ADMIN_ROW,
  ADMIN_SECTION_TITLE,
  ADMIN_TABLE,
  ADMIN_TD,
  ADMIN_TH,
} from "@/modules/admin/shared/admin.styles";
import { CATEGORY_META } from "../enterprise.guardrails.constants";
import type { DraftState } from "../enterprise.guardrails.types";
import { ActionSelect } from "./ActionSelect";

export const CategoryTable = ({
  settings,
  rows,
  updateDraft,
}: {
  settings: UseResourceResult<GuardrailSettings>;
  rows: DraftState;
  updateDraft: (patch: Partial<DraftState>) => void;
}) => (
  <section
    aria-labelledby="guardrail-categories"
    className="panel q-in min-w-0 px-1.5 pb-1.5 pt-[18px]"
    style={{ "--i": 1 } as React.CSSProperties}
  >
    <h2
      id="guardrail-categories"
      className={`mx-3.5 mb-1.5 ${ADMIN_SECTION_TITLE}`}
    >
      Categories
    </h2>
    <ResourceStatus
      failed={settings.failed}
      empty={settings.empty}
      loading={
        <p className="px-3.5 py-3 text-sm text-[var(--muted)]">
          Loading guardrails…
        </p>
      }
      error={
        <p className="px-3.5 py-3 text-sm text-[var(--danger)]">
          {(settings.error as Error)?.message}
        </p>
      }
    >
      <div className="overflow-x-auto">
        <table className={`${ADMIN_TABLE} min-w-[600px]`}>
          <thead>
            <tr>
              <th scope="col" className={ADMIN_TH}>
                Category
              </th>
              <th scope="col" className={ADMIN_TH}>
                Action
              </th>
              <th scope="col" className={ADMIN_TH}>
                Default
              </th>
            </tr>
          </thead>
          <tbody>
            {CATEGORY_META.map((meta) => {
              const current = rows.categories[meta.id];
              const changed = current !== meta.defaultAction;
              return (
                <tr key={meta.id} className={ADMIN_ROW}>
                  <td className={`${ADMIN_TD} align-top`}>
                    <span className="text-[var(--ink)]">{meta.label}</span>
                    {meta.severe ? (
                      <span className="ml-2.5 inline-flex items-center gap-[5px] rounded-full border border-[var(--danger)]/35 px-[9px] py-0.5 text-[11px] text-[var(--danger)]">
                        <span
                          aria-hidden
                          className="h-1 w-1 rounded-full bg-[var(--danger)]"
                        />
                        Severe
                      </span>
                    ) : null}
                    <p className="mt-1 max-w-md text-xs text-[var(--muted)]">
                      {meta.description}
                    </p>
                  </td>
                  <td className="px-3.5 py-1.5 align-top">
                    <ActionSelect
                      label={`Action for ${meta.label}`}
                      value={current}
                      onChange={(value) =>
                        updateDraft({
                          categories: { ...rows.categories, [meta.id]: value },
                        })
                      }
                    />
                  </td>
                  <td
                    className={`${ADMIN_TD} align-top font-mono text-xs ${
                      changed ? "text-[var(--warm)]" : "text-[var(--faint)]"
                    }`}
                  >
                    {changed
                      ? `${meta.defaultAction} · changed`
                      : meta.defaultAction}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ResourceStatus>
  </section>
);
