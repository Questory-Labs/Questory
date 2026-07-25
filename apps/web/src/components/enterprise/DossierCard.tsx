"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchDossier } from "@/lib/enterprise-api";
import styles from "./recommendations.module.css";

/** Collapsible "Your taste fingerprint" card from the dossier endpoint. */
export function DossierCard() {
  const [open, setOpen] = useState(false);
  const dossier = useQuery({
    queryKey: ["enterprise-dossier"],
    queryFn: fetchDossier,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const d = dossier.data?.dossier;
  if (!dossier.data?.available || !d) return null;

  return (
    <section className={styles.dossier}>
      <button
        type="button"
        className={styles.dossierToggle}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Your taste fingerprint
        <span aria-hidden>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className={styles.dossierBody}>
          <p className={styles.dossierIdentity}>{d.identity}</p>
          <dl className={styles.dossierSections}>
            {(
              [
                ["Gaming", d.gaming],
                ["Music", d.music],
                ["Watching", d.watch],
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
