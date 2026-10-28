"use client";

import { Button, Panel } from "@questorylabs/ui";
import { ADMIN_SECTION_TITLE } from "@/modules/admin/shared/admin.styles";
import type { DraftState } from "../enterprise.guardrails.types";
import { ActionSelect } from "./ActionSelect";

export const RegexRulesPanel = ({
  rows,
  updateDraft,
}: {
  rows: DraftState;
  updateDraft: (patch: Partial<DraftState>) => void;
}) => (
  <Panel
    variant="accent"
    wrapperClassName="q-in min-w-0 flex-[1_1_360px]"
    className="h-full px-5 py-[18px]"
  >
    <h2 className={ADMIN_SECTION_TITLE}>Regex rules</h2>
    <p className="mt-1 text-[13px] text-[var(--muted)]">
      Rust regex syntax. Invalid patterns are skipped at runtime.
    </p>
    {rows.regexRules.length === 0 ? (
      <p className="mt-3 text-sm text-[var(--muted)]">No custom regex rules.</p>
    ) : (
      <ul className="mt-3 text-[13px]">
        {rows.regexRules.map((rule, index) => (
          <li
            key={index}
            className="flex flex-wrap items-center gap-2.5 border-t border-[var(--warm)]/10 py-2.5"
          >
            <input
              className="min-h-9 min-w-[12rem] flex-1 rounded-full border border-white/[0.08] bg-black/30 px-3.5 font-mono text-xs text-[var(--warm)]"
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
              variant="ghost-danger"
              size="sm"
              aria-label={`Remove rule ${index + 1}`}
              onClick={() => {
                const next = rows.regexRules.filter((_, i) => i !== index);
                updateDraft({ regexRules: next });
              }}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    )}
    <Button
      variant="secondary"
      className="mt-3.5"
      onClick={() =>
        updateDraft({
          regexRules: [...rows.regexRules, { pattern: "", action: "block" }],
        })
      }
    >
      Add rule
    </Button>
  </Panel>
);
