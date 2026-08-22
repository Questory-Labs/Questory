"use client";

import type { UseResourceResult } from "@questorylabs/qhttp/react";
import { Panel, ResourceStatus } from "@questorylabs/ui";
import type { GuardrailSettings } from "@/lib/enterprise-api";
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
  <Panel className="overflow-x-auto p-4">
    <h2 className="mb-3 font-display text-lg font-bold">Categories</h2>
    <ResourceStatus
      failed={settings.failed}
      empty={settings.empty}
      loading={
        <p className="text-sm text-[var(--muted)]">Loading guardrails…</p>
      }
      error={
        <p className="text-sm text-red-400">
          {(settings.error as Error)?.message}
        </p>
      }
    >
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--line)] text-[var(--muted)]">
            <th className="pb-2 pr-4 font-medium">Category</th>
            <th className="pb-2 pr-4 font-medium">Action</th>
            <th className="pb-2 font-medium">Default</th>
          </tr>
        </thead>
        <tbody>
          {CATEGORY_META.map((meta) => (
            <tr
              key={meta.id}
              className="border-b border-[var(--line)] last:border-0"
            >
              <td className="py-3 pr-4 align-top">
                <div className="font-medium text-[var(--ink)]">{meta.label}</div>
                <div className="mt-1 max-w-md text-xs text-[var(--muted)]">
                  {meta.description}
                </div>
              </td>
              <td className="py-3 pr-4 align-top">
                <ActionSelect
                  label={`Action for ${meta.label}`}
                  value={rows.categories[meta.id]}
                  onChange={(value) =>
                    updateDraft({
                      categories: { ...rows.categories, [meta.id]: value },
                    })
                  }
                />
              </td>
              <td className="py-3 align-top text-[var(--muted)]">
                {meta.defaultAction}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ResourceStatus>
  </Panel>
);
