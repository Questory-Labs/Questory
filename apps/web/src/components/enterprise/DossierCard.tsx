"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchDossier, refreshDossier } from "@/lib/enterprise-api";
import styles from "./recommendations.module.css";

/** Collapsible "Your taste fingerprint" card from the dossier endpoint. */
export function DossierCard() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const dossier = useQuery({
    queryKey: ["enterprise-dossier"],
    queryFn: fetchDossier,
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const refresh = useMutation({
    mutationFn: refreshDossier,
    onSuccess: (view) => {
      queryClient.setQueryData(["enterprise-dossier"], view);
    },
  });

  const d = dossier.data?.dossier;
  if (!dossier.data?.available || !d) return null;

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
          onClick={() => refresh.mutate()}
          disabled={refresh.isPending}
          aria-label="Refresh taste fingerprint"
          title="Regenerate from your latest activity"
        >
          <span aria-hidden className={refresh.isPending ? styles.dossierRefreshSpin : undefined}>
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
