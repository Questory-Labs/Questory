"use client";

import { Button, Panel } from "@questorylabs/ui";
import type { DraftState } from "../enterprise.guardrails.types";
import { ActionSelect } from "./ActionSelect";

export const RegexRulesPanel = ({
  rows,
  updateDraft,
}: {
  rows: DraftState;
  updateDraft: (patch: Partial<DraftState>) => void;
}) => (
  <Panel className="space-y-3 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-display text-lg font-bold">Custom regex rules</h2>
      <Button
        variant="secondary"
        onClick={() =>
          updateDraft({
            regexRules: [...rows.regexRules, { pattern: "", action: "block" }],
          })
        }
      >
        Add rule
      </Button>
    </div>
    <p className="text-sm text-[var(--muted)]">
      Rust regex syntax. Invalid patterns are skipped at runtime.
    </p>
    {rows.regexRules.length === 0 ? (
      <p className="text-sm text-[var(--muted)]">No custom regex rules.</p>
    ) : (
      <div className="space-y-2">
        {rows.regexRules.map((rule, index) => (
          <div
            key={index}
            className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-2 first:border-0 first:pt-0"
          >
            <input
              className="min-w-[12rem] flex-1 rounded border border-[var(--line)] bg-[var(--bg-0)] px-2 py-1.5 font-mono text-sm"
              placeholder="pattern"
              value={rule.pattern}
              onChange={(e) => {
                const next = [...rows.regexRules];
                next[index] = { ...rule, pattern: e.target.value };
                updateDraft({ regexRules: next });
              }}
              aria-label={`Regex pattern ${index + 1}`}
            />
            <ActionSelect
              label={`Regex action ${index + 1}`}
              value={rule.action}
              onChange={(value) => {
                const next = [...rows.regexRules];
                next[index] = { ...rule, action: value };
                updateDraft({ regexRules: next });
              }}
            />
            <Button
              variant="secondary"
              onClick={() => {
                const next = rows.regexRules.filter((_, i) => i !== index);
                updateDraft({ regexRules: next });
              }}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
    )}
  </Panel>
);
