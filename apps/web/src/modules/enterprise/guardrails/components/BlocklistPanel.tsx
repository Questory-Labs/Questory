"use client";

import { Panel } from "@questorylabs/ui";
import type { DraftState } from "../enterprise.guardrails.types";
import { ActionSelect } from "./ActionSelect";

export const BlocklistPanel = ({
  rows,
  updateDraft,
}: {
  rows: DraftState;
  updateDraft: (patch: Partial<DraftState>) => void;
}) => (
  <Panel className="space-y-3 p-4">
    <h2 className="font-display text-lg font-bold">Custom blocklist</h2>
    <p className="text-sm text-[var(--muted)]">
      One term or phrase per line. Phrases with spaces match as substrings;
      single words match whole tokens only.
    </p>
    <div className="flex flex-wrap items-center gap-3">
      <label className="text-sm text-[var(--muted)]" htmlFor="blocklist-action">
        Action on match
      </label>
      <ActionSelect
        label="Blocklist action"
        value={rows.blocklistAction}
        onChange={(value) => updateDraft({ blocklistAction: value })}
      />
    </div>
    <textarea
      id="guardrail-blocklist"
      className="min-h-[8rem] w-full rounded border border-[var(--line)] bg-[var(--bg-0)] px-3 py-2 font-mono text-sm"
      placeholder={"badword\nforbidden phrase"}
      value={rows.blocklistText}
      onChange={(e) => updateDraft({ blocklistText: e.target.value })}
    />
  </Panel>
);
