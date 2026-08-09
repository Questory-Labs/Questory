"use client";

import { useMemo, useState } from "react";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Panel } from "@/components/ui/Panel";
import {
  fetchGuardrailSettings,
  saveGuardrailSettings,
  type GuardrailAction,
  type GuardrailRegexRule,
  type GuardrailSettings,
} from "@/lib/enterprise-api";

const ACTIONS: GuardrailAction[] = ["allow", "mask", "rewrite", "block"];

const CATEGORY_META = [
  {
    id: "illegal_activity",
    label: "Illegal activity",
    description: "Instructions for serious crimes (weapons, drugs, fraud, hacking).",
    severe: true,
    defaultAction: "block" as const,
  },
  {
    id: "self_harm",
    label: "Self-harm",
    description: "Suicide or self-harm encouragement and how-to content.",
    severe: true,
    defaultAction: "block" as const,
  },
  {
    id: "hate_speech",
    label: "Hate speech",
    description: "Slurs and dehumanizing language about protected groups.",
    severe: true,
    defaultAction: "block" as const,
  },
  {
    id: "harassment",
    label: "Harassment",
    description: "Targeted insults, threats, and bullying language.",
    severe: true,
    defaultAction: "block" as const,
  },
  {
    id: "violence",
    label: "Violence / gore",
    description: "Graphic violence descriptions (catalog blurbs may reference mature themes).",
    severe: false,
    defaultAction: "mask" as const,
  },
  {
    id: "sexual_content",
    label: "Sexual content",
    description: "Explicit adult sexual content in prompts or model output.",
    severe: false,
    defaultAction: "mask" as const,
  },
  {
    id: "pii",
    label: "Personal data (PII)",
    description: "SSNs, card numbers, phone numbers, and address-like patterns.",
    severe: false,
    defaultAction: "mask" as const,
  },
  {
    id: "profanity",
    label: "Profanity",
    description: "Cursing and vulgar language.",
    severe: false,
    defaultAction: "mask" as const,
  },
] as const;

type CategoryId = (typeof CATEGORY_META)[number]["id"];

type DraftState = {
  categories: Record<CategoryId, GuardrailAction>;
  blocklistText: string;
  blocklistAction: GuardrailAction;
  regexRules: GuardrailRegexRule[];
};

function emptyCategories(): Record<CategoryId, GuardrailAction> {
  return Object.fromEntries(
    CATEGORY_META.map((c) => [c.id, c.defaultAction]),
  ) as Record<CategoryId, GuardrailAction>;
}

function settingsToDraft(data: GuardrailSettings | undefined): DraftState {
  const categories = emptyCategories();
  for (const meta of CATEGORY_META) {
    const action = data?.categories?.[meta.id];
    if (ACTIONS.includes(action as GuardrailAction)) {
      categories[meta.id] = action as GuardrailAction;
    }
  }
  return {
    categories,
    blocklistText: (data?.blocklist ?? []).join("\n"),
    blocklistAction: ACTIONS.includes(data?.blocklistAction as GuardrailAction)
      ? (data!.blocklistAction as GuardrailAction)
      : "block",
    regexRules: (data?.regexRules ?? []).map((r) => ({
      pattern: r.pattern,
      action: ACTIONS.includes(r.action) ? r.action : "block",
    })),
  };
}

function draftToPayload(draft: DraftState): GuardrailSettings {
  return {
    categories: draft.categories,
    blocklist: draft.blocklistText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    blocklistAction: draft.blocklistAction,
    regexRules: draft.regexRules
      .map((r) => ({
        pattern: r.pattern.trim(),
        action: r.action,
      }))
      .filter((r) => r.pattern.length > 0),
  };
}

function severeAllowDowngrades(
  saved: DraftState,
  draft: DraftState,
): string[] {
  return CATEGORY_META.filter(
    (c) =>
      c.severe &&
      (saved.categories[c.id] ?? c.defaultAction) === "block" &&
      draft.categories[c.id] === "allow",
  ).map((c) => c.label);
}

function ActionSelect({
  value,
  onChange,
  label,
}: {
  value: GuardrailAction;
  onChange: (value: GuardrailAction) => void;
  label: string;
}) {
  return (
    <select
      className="rounded border border-[var(--line)] bg-[var(--bg-0)] px-2 py-1.5 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value as GuardrailAction)}
      aria-label={label}
    >
      {ACTIONS.map((action) => (
        <option key={action} value={action}>
          {action}
        </option>
      ))}
    </select>
  );
}

export function GuardrailsSettings() {
  const store = useStore();
  const settings = useResource({
    id: ["enterprise-guardrails"],
    load: fetchGuardrailSettings,
    freshFor: 30_000,
    retries: 1,
  });

  const [draft, setDraft] = useState<DraftState | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const saved = useMemo(
    () => settingsToDraft(settings.value),
    [settings.value],
  );

  const rows = draft ?? saved;

  const save = useAction({
    run: (payload: GuardrailSettings) => saveGuardrailSettings(payload),
    onSuccess: (data) => {
      store.push(["enterprise-guardrails"], data);
      setDraft(null);
      setConfirmOpen(false);
    },
  });

  const dirty = draft !== null;

  const updateDraft = (patch: Partial<DraftState>) => {
    setDraft({ ...rows, ...patch });
  };

  const requestSave = () => {
    if (!draft) return;
    const downgrades = severeAllowDowngrades(saved, draft);
    if (downgrades.length > 0) {
      setConfirmOpen(true);
      return;
    }
    save.submit(draftToPayload(draft));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          LLM guardrails
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Per-category content-safety policy for the QEngine chat pipeline.
          Changes apply immediately without a restart.
        </p>
      </div>

      <Panel className="overflow-x-auto p-4">
        <h2 className="mb-3 font-display text-lg font-bold">Categories</h2>
        {settings.failed ? (
          <p className="text-sm text-red-400">
            {(settings.error as Error).message}
          </p>
        ) : settings.empty ? (
          <p className="text-sm text-[var(--muted)]">Loading guardrails…</p>
        ) : (
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
                    <div className="font-medium text-[var(--ink)]">
                      {meta.label}
                    </div>
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
        )}
      </Panel>

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

      <Panel className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">Custom regex rules</h2>
          <Button
            variant="secondary"
            onClick={() =>
              updateDraft({
                regexRules: [
                  ...rows.regexRules,
                  { pattern: "", action: "block" },
                ],
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

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={!dirty || save.busy} onClick={requestSave}>
          {save.busy ? "Saving…" : "Save guardrails"}
        </Button>
        {dirty ? (
          <Button variant="secondary" onClick={() => setDraft(null)}>
            Reset changes
          </Button>
        ) : null}
        {save.failed ? (
          <span className="text-sm text-red-400">
            {(save.error as Error).message}
          </span>
        ) : null}
      </div>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Allow severe categories?"
      >
        <p className="text-sm text-[var(--muted)]">
          You are changing{" "}
          {severeAllowDowngrades(saved, draft ?? saved).join(", ")} from{" "}
          <strong>block</strong> to <strong>allow</strong>. Unsafe content in
          those categories will pass through the LLM pipeline.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={save.busy}
            onClick={() => draft && save.submit(draftToPayload(draft))}
          >
            {save.busy ? "Saving…" : "Confirm and save"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
