"use client";

import { useMutation, useQueryClient } from "@questorylabs/qhttp/react";
import { Button, Panel } from "@/components/ui";
import { ScraperConfigEditor } from "@/components/admin/scrapers/ScraperConfigEditor";
import { ScraperTestPanel } from "@/components/admin/scrapers/ScraperTestPanel";
import { statusLabel } from "@/components/admin/scrapers/ScraperIterationList";
import { api } from "@/lib/api";
import type {
  ScraperIterationRecord,
  ScraperProviderDetail,
} from "@questorylabs/shared";
import { useEffect, useState } from "react";

type Draft = {
  label: string;
  config: ScraperIterationRecord["config"];
};

const STEPS = ["draft", "validate", "publish"] as const;
type Step = (typeof STEPS)[number];

function stepIndex(status: ScraperIterationRecord["status"]): number {
  if (status === "validated") return 1;
  if (status === "published" || status === "archived") return 2;
  return 0;
}

type Props = {
  providerKey: string;
  detail: ScraperProviderDetail;
};

export function ScraperIterationWorkflow({ providerKey, detail }: Props) {
  const qc = useQueryClient();
  const iteration = detail.openIteration;
  const [activeStep, setActiveStep] = useState<Step>("draft");
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    if (!iteration) {
      setDraft(null);
      return;
    }
    setDraft({
      label: iteration.label ?? `v${iteration.version}`,
      config: iteration.config,
    });
    setActiveStep(
      iteration.status === "validated"
        ? "validate"
        : iteration.status === "draft"
          ? "draft"
          : "draft",
    );
  }, [iteration]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-scraper-provider", providerKey] });
    qc.invalidateQueries({ queryKey: ["admin-scraper-providers"] });
  };

  const createDraft = useMutation({
    mutationFn: () =>
      api<ScraperProviderDetail>(
        `/admin/scrapers/providers/${providerKey}/iterations`,
        { method: "POST" },
      ),
    onSuccess: invalidate,
  });

  const save = useMutation({
    mutationFn: () => {
      if (!iteration || !draft) throw new Error("Nothing to save");
      return api<ScraperIterationRecord>(
        `/admin/scrapers/providers/${providerKey}/iterations/${iteration.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            label: draft.label,
            config: draft.config,
          }),
        },
      );
    },
    onSuccess: invalidate,
  });

  const publish = useMutation({
    mutationFn: () => {
      if (!iteration) throw new Error("No iteration");
      return api<ScraperProviderDetail>(
        `/admin/scrapers/providers/${providerKey}/iterations/${iteration.id}/publish`,
        { method: "POST" },
      );
    },
    onSuccess: invalidate,
  });

  const discard = useMutation({
    mutationFn: () => {
      if (!iteration) throw new Error("No iteration");
      return api<ScraperProviderDetail>(
        `/admin/scrapers/providers/${providerKey}/iterations/${iteration.id}`,
        { method: "DELETE" },
      );
    },
    onSuccess: invalidate,
  });

  if (!iteration) {
    return (
      <Panel className="p-5">
        <h3 className="font-display text-lg font-bold">Open iteration</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Start a new draft from the current published config (or the provider
          default). Publish when ready — that becomes the live scraper.
        </p>
        <Button
          className="mt-4"
          disabled={createDraft.isPending}
          onClick={() => createDraft.mutate()}
        >
          {createDraft.isPending ? "Creating…" : "Start new iteration"}
        </Button>
        {createDraft.isError ? (
          <p className="mt-3 text-sm text-red-400">
            {createDraft.error instanceof Error
              ? createDraft.error.message
              : "Failed to create draft"}
          </p>
        ) : null}
      </Panel>
    );
  }

  const currentStep = stepIndex(iteration.status);
  const canPublish = iteration.status === "validated";

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold">Open iteration</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            v{iteration.version} · {statusLabel(iteration.status)}
          </p>
        </div>
        <Button
          variant="secondary"
          disabled={discard.isPending}
          onClick={() => {
            if (
              window.confirm("Discard this draft? Unpublished changes will be lost.")
            ) {
              discard.mutate();
            }
          }}
        >
          Discard
        </Button>
      </div>

      <ol className="mt-6 flex flex-wrap gap-2">
        {STEPS.map((step, index) => {
          const done = index < currentStep;
          const active = activeStep === step;
          return (
            <li key={step}>
              <button
                type="button"
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                  active
                    ? "bg-[var(--accent)] text-black"
                    : done
                      ? "bg-[var(--accent-dim)] text-[var(--accent)]"
                      : "bg-[var(--bg-2)] text-[var(--muted)]"
                }`}
                onClick={() => setActiveStep(step)}
              >
                {index + 1}. {step}
              </button>
            </li>
          );
        })}
      </ol>

      {activeStep === "draft" && draft ? (
        <div className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="text-[var(--muted)]">Iteration label</span>
            <input
              className="mt-1 w-full rounded border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2"
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            />
          </label>
          <ScraperConfigEditor
            draft={{
              name: draft.label,
              sourceKey: providerKey,
              enabled: detail.enabled,
              config: draft.config,
            }}
            onChange={(next) =>
              setDraft({
                label: next.name,
                config: next.config,
              })
            }
            hideMeta
          />
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Saving…" : "Save draft"}
          </Button>
          {save.isError ? (
            <p className="text-sm text-red-400">
              {save.error instanceof Error ? save.error.message : "Save failed"}
            </p>
          ) : null}
        </div>
      ) : null}

      {activeStep === "validate" ? (
        <div className="mt-6">
          <ScraperTestPanel
            providerKey={providerKey}
            iterationId={iteration.id}
            onValidated={() => invalidate()}
          />
          {iteration.status === "validated" ? (
            <p className="mt-3 text-sm text-[var(--accent)]">
              Iteration validated. You can publish it.
            </p>
          ) : (
            <p className="mt-3 text-sm text-[var(--muted)]">
              Run a dry scrape and click Validate. Editing the draft resets
              validation.
            </p>
          )}
        </div>
      ) : null}

      {activeStep === "publish" ? (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-[var(--muted)]">
            Publishing replaces the current live iteration. The previous current
            version moves to previous iterations.
          </p>
          <Button
            disabled={!canPublish || publish.isPending}
            onClick={() => publish.mutate()}
          >
            {publish.isPending ? "Publishing…" : "Publish iteration"}
          </Button>
          {!canPublish ? (
            <p className="text-sm text-[var(--muted)]">
              Validate the iteration before publishing.
            </p>
          ) : null}
          {publish.isError ? (
            <p className="text-sm text-red-400">
              {publish.error instanceof Error
                ? publish.error.message
                : "Publish failed"}
            </p>
          ) : null}
        </div>
      ) : null}
    </Panel>
  );
}
