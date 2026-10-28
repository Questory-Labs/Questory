"use client";

import { Button, Dialog, PageHeader } from "@questorylabs/ui";
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
    <div className="space-y-3.5">
      <PageHeader
        size="md"
        className="mb-0 px-1 pb-2.5 pt-2"
        eyebrow="Checked on every QEngine prompt and response"
        title={
          <>
            LLM guardrails,{" "}
            <span className="font-serif text-[var(--warm)]">per category</span>
          </>
        }
        description="Per-category content-safety policy for the QEngine chat pipeline. Changes apply immediately without a restart."
        actions={
          <>
            <Button
              variant="secondary"
              size="lg"
              disabled={!dirty || save.busy}
              onClick={() => setDraft(null)}
            >
              Reset changes
            </Button>
            <Button
              size="lg"
              disabled={!dirty || save.busy}
              onClick={requestSave}
            >
              {save.busy ? "Saving…" : "Save changes"}
            </Button>
          </>
        }
      />

      {save.failed ? (
        <p role="alert" className="px-1 text-sm text-[var(--danger)]">
          {(save.error as Error).message}
        </p>
      ) : null}

      <CategoryTable
        settings={settings}
        rows={rows}
        updateDraft={updateDraft}
      />

      <div className="flex flex-wrap gap-3.5">
        <BlocklistPanel rows={rows} updateDraft={updateDraft} />
        <RegexRulesPanel rows={rows} updateDraft={updateDraft} />
      </div>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Allow a severe category?"
      >
        <p className="text-sm text-[var(--dim)]">
          {severeAllowDowngrades(saved, draft ?? saved).join(", ")} will no
          longer be blocked. Unsafe content in those categories will pass
          through the QEngine pipeline to every user on this instance.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
            Keep blocked
          </Button>
          <Button
            variant="danger"
            disabled={save.busy}
            onClick={() => draft && save.submit(draftToPayload(draft))}
          >
            {save.busy ? "Saving…" : "Allow anyway"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
};
