"use client";

import { useState } from "react";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { Button, Dialog } from "@questorylabs/ui";
import { fetchDossier, refreshDossier } from "@/lib/enterprise-api";
import { JOB_POLL_MS } from "@/lib/polling";
import styles from "../recommendations.module.css";

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
    <section className={styles.dossier}>
      <div className={styles.dossierHeader}>
        <button
          type="button"
          className={styles.dossierToggle}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          Your taste fingerprint
          <span aria-hidden>{open ? "−" : "+"}</span>
        </button>
        <button
          type="button"
          className={styles.dossierRefresh}
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
          <span
            aria-hidden
            className={busy ? styles.dossierRefreshSpin : undefined}
          >
            ↻
          </span>
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
      {busy && (
        <p className={styles.dossierStatus} aria-live="polite">
          Refreshing from your latest activity…
        </p>
      )}
      {errorText && (
        <p className={styles.dossierError} role="alert">
          {errorText}
        </p>
      )}
      {open && (
        <div className={styles.dossierBody}>
          <p className={styles.dossierIdentity}>{d.identity}</p>
          <dl className={styles.dossierSections}>
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
                <div key={label} className={styles.dossierSection}>
                  <dt>{label}</dt>
                  <dd>{text}</dd>
                </div>
              ))}
          </dl>
          {d.keywords.length > 0 && (
            <div className={styles.dossierKeywords}>
              {d.keywords.map((kw) => (
                <span key={kw} className={styles.dossierKeyword}>
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
