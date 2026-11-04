"use client";

import { useState } from "react";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { Button, Dialog } from "@questorylabs/ui";
import {
  fetchDossier,
  fetchRecommendationHistory,
  refreshDossier,
} from "@/lib/enterprise-api";
import { JOB_POLL_MS } from "@/lib/polling";
import { HISTORY_RESOURCE_ID } from "./PreviousSlates";

/** Collapsible "Your taste fingerprint" card from the dossier endpoint. */
export const DossierCard = () => {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const store = useStore();
  const dossier = useResource({
    id: ["enterprise-dossier"],
    load: fetchDossier,
    freshFor: 5 * 60_000,
    refreshEvery: (value) => (value?.refreshing ? JOB_POLL_MS : false),
    retries: 1,
  });
  const history = useResource({
    id: [...HISTORY_RESOURCE_ID],
    load: () => fetchRecommendationHistory(4),
    when: open,
    freshFor: 60_000,
    retries: 1,
  });
  const refresh = useAction({
    run: refreshDossier,
    onSuccess: (view) => {
      store.push(["enterprise-dossier"], view);
    },
  });

  const d = dossier.value?.dossier;
  if (!dossier.value?.available || !d) return null;

  const busy = refresh.busy || Boolean(dossier.value.refreshing);
  const errorText = busy
    ? undefined
    : refresh.failed
      ? "Couldn't refresh your taste fingerprint."
      : dossier.value.error;

  const confirmRefresh = () => {
    setConfirmOpen(false);
    void refresh.submitAsync().catch(() => undefined);
  };

  return (
    <section className="min-w-0 flex-[1_1_320px] self-start rounded-[20px] border border-white/[0.06] bg-black/30 p-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-normal text-[var(--ink)]"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <svg
            aria-hidden="true"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-500 ${open ? "rotate-90" : ""}`}
          >
            <path d="m9 6 6 6-6 6" />
          </svg>
          Your taste fingerprint
        </button>
        <button
          type="button"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/[0.12] px-3.5 text-[13px] text-[var(--ink)] transition-transform duration-500 hover:-translate-y-0.5 disabled:opacity-50"
          onClick={() => setConfirmOpen(true)}
          disabled={busy}
          aria-busy={busy}
          aria-label={
            busy ? "Refreshing taste fingerprint" : "Refresh taste fingerprint"
          }
          title={
            busy
              ? "Refreshing from your latest activity"
              : "Regenerate from your latest activity"
          }
        >
          <span aria-hidden className={busy ? "q-spin inline-block" : undefined}>
            ↻
          </span>
          Regenerate
        </button>
      </div>
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Refresh taste fingerprint?"
      >
        <p className="text-sm text-[var(--muted)]">
          This will regenerate your taste fingerprint from your latest activity.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button onClick={confirmRefresh} disabled={busy}>
            Regenerate
          </Button>
        </div>
      </Dialog>
      <p className="mt-3 font-serif text-[17px] leading-[1.3] text-[#cfcfd3]">
        {d.identity}
      </p>
      {busy && (
        <p className="mt-2 text-xs text-[var(--muted)]" aria-live="polite">
          Refreshing from your latest activity…
        </p>
      )}
      {errorText && (
        <p className="mt-2 text-xs text-[var(--danger)]" role="alert">
          {errorText}
        </p>
      )}
      {open && (
        <div className="q-in mt-3 space-y-3">
          <dl className="space-y-2">
            {(
              [
                ["Gaming", d.gaming],
                ["Music", d.music],
                ["Watching", d.watch],
                ["Reading", d.read ?? ""],
                ["Right now", d.currentVibe],
              ] as const
            )
              .filter(([, text]) => text && text !== "Not enough data.")
              .map(([label, text]) => (
                <div key={label}>
                  <dt className="label-mono text-[10px] text-[var(--faint)]">{label}</dt>
                  <dd className="mt-0.5 text-sm text-[var(--muted)]">{text}</dd>
                </div>
              ))}
          </dl>
          {d.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {d.keywords.map((kw) => (
                <span
                  key={kw}
                  className="rounded-full border border-[var(--line)] px-2.5 py-0.5 text-xs text-[var(--muted)]"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
          {(
            [
              ["You liked", history.value?.liked ?? []],
              ["You passed on", history.value?.passed ?? []],
            ] as const
          )
            .filter(([, names]) => names.length > 0)
            .map(([label, names]) => (
              <div key={label}>
                <p className="label-mono text-[10px] text-[var(--faint)]">{label}</p>
                <p className="mt-0.5 text-sm text-[var(--muted)]">
                  {names.slice(0, 12).join(" · ")}
                </p>
              </div>
            ))}
        </div>
      )}
    </section>
  );
};
