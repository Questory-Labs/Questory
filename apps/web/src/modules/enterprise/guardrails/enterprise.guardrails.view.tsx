"use client";

import { Button, Dialog } from "@questorylabs/ui";
import { BlocklistPanel } from "./components/BlocklistPanel";
import { CategoryTable } from "./components/CategoryTable";
import { RegexRulesPanel } from "./components/RegexRulesPanel";
import type { GuardrailsViewProps } from "./enterprise.guardrails.types";
import { draftToPayload, severeAllowDowngrades } from "./enterprise.guardrails.utils";

export const GuardrailsView = (props: Record<string, unknown>) => {
  const {
    enabled,
    isLoading,
    settings,
    rows,
    saved,
    draft,
    dirty,
    confirmOpen,
    save,
    updateDraft,
    requestSave,
    setDraft,
    setConfirmOpen,
  } = props as GuardrailsViewProps;

  if (isLoading) {
    return (
      <p className="text-sm text-[var(--muted)]">Checking QEngine…</p>
    );
  }

  if (!enabled) {
    return (
      <p className="text-sm text-[var(--muted)]">
        QEngine guardrails are not available on this instance.
      </p>
    );
  }

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

      <CategoryTable
        settings={settings}
        rows={rows}
        updateDraft={updateDraft}
      />

      <BlocklistPanel rows={rows} updateDraft={updateDraft} />

      <RegexRulesPanel rows={rows} updateDraft={updateDraft} />

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
};
