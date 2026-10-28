"use client";

import { Button } from "@questorylabs/ui";
import { useState } from "react";
import { ADMIN_SECTION_TITLE } from "@/modules/admin/shared/admin.styles";
import type { DraftState } from "../enterprise.guardrails.types";
import { blocklistEntries } from "../enterprise.guardrails.utils";
import { ActionSelect } from "./ActionSelect";

export const BlocklistPanel = ({
  rows,
  updateDraft,
}: {
  rows: DraftState;
  updateDraft: (patch: Partial<DraftState>) => void;
}) => {
  const [phrase, setPhrase] = useState("");
  const entries = blocklistEntries(rows.blocklistText);

  const add = () => {
    const next = phrase.trim();
    if (!next) return;
    if (!entries.some((e) => e.toLowerCase() === next.toLowerCase())) {
      updateDraft({ blocklistText: [...entries, next].join("\n") });
    }
    setPhrase("");
  };

  return (
    <section
      aria-labelledby="guardrail-blocklist"
      className="panel q-in min-w-0 flex-[1_1_360px] px-5 py-[18px]"
      style={{ "--i": 3 } as React.CSSProperties}
    >
      <h2 id="guardrail-blocklist" className={ADMIN_SECTION_TITLE}>
        Custom blocklist
      </h2>
      <p className="mt-1 text-[13px] text-[var(--muted)]">
        Phrases with spaces match as substrings; single words match whole
        tokens only.
      </p>
      <div className="mt-3.5 flex flex-wrap items-center gap-3">
        <span className="label-mono">Action on match</span>
        <ActionSelect
          label="Blocklist action"
          value={rows.blocklistAction}
          onChange={(value) => updateDraft({ blocklistAction: value })}
        />
      </div>
      {entries.length === 0 ? (
        <p className="mt-3.5 text-sm text-[var(--muted)]">
          No blocked phrases.
        </p>
      ) : (
        <ul className="mt-3.5 flex flex-wrap gap-1.5">
          {entries.map((entry, index) => (
            <li
              key={`${entry}-${index}`}
              className="inline-flex items-center gap-0.5 rounded-full border border-white/[0.08] bg-white/[0.06] py-0.5 pl-3 pr-1 font-mono text-xs transition hover:bg-white/10"
            >
              {entry}
              <button
                type="button"
                aria-label={`Remove ${entry}`}
                onClick={() =>
                  updateDraft({
                    blocklistText: entries
                      .filter((_, i) => i !== index)
                      .join("\n"),
                  })
                }
                className="min-h-7 min-w-7 rounded-full text-[var(--muted)] hover:text-[var(--ink)]"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="mt-3.5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input
          aria-label="Add phrase"
          placeholder="Add a phrase"
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          className="min-h-[42px] min-w-0 flex-1 rounded-full border border-white/[0.08] bg-black/30 px-4 text-sm text-[var(--ink)]"
        />
        <Button type="submit" variant="secondary" disabled={!phrase.trim()}>
          Add
        </Button>
      </form>
    </section>
  );
};
