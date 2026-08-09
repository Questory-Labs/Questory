"use client";

import { useState } from "react";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { fetchDossier, refreshDossier } from "@/lib/enterprise-api";
import styles from "./recommendations.module.css";

/** Collapsible "Your taste fingerprint" card from the dossier endpoint. */
export function DossierCard() {
  const [open, setOpen] = useState(false);
  const store = useStore();
  const dossier = useResource({
    id: ["enterprise-dossier"],
    load: fetchDossier,
    freshFor: 5 * 60_000,
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
          onClick={() => refresh.submit()}
          disabled={refresh.busy}
          aria-label="Refresh taste fingerprint"
          title="Regenerate from your latest activity"
        >
          <span aria-hidden className={refresh.busy ? styles.dossierRefreshSpin : undefined}>
            ↻
          </span>
        </button>
      </div>
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
}
