"use client";

import { useState } from "react";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { fetchSettings, saveSettings } from "@/lib/enterprise-api";
import styles from "../recommendations.module.css";

/**
 * Small country/state/city form. Location powers weather, holidays and
 * local-event awareness; the engine geocodes on save. Unset → the world
 * strip shows a "Set your location" hint that opens this form.
 */
export const LocationSettings = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const store = useStore();
  const settings = useResource({
    id: ["enterprise-settings"],
    load: fetchSettings,
    freshFor: 5 * 60_000,
    retries: 1,
  });

  const [draft, setDraft] = useState<{
    country: string;
    state: string;
    city: string;
  } | null>(null);

  const save = useAction({
    run: saveSettings,
    onSuccess: (data) => {
      store.push(["enterprise-settings"], data);
      onClose();
    },
  });

  if (!open) return null;

  const current = draft ?? {
    country: settings.value?.country ?? "",
    state: settings.value?.state ?? "",
    city: settings.value?.city ?? "",
  };

  const set =
    (field: "country" | "state" | "city") =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setDraft({ ...current, [field]: e.target.value });

  return (
    <form
      className={styles.settingsForm}
      onSubmit={(e) => {
        e.preventDefault();
        save.submit({
          country: current.country.trim() || undefined,
          state: current.state.trim() || undefined,
          city: current.city.trim() || undefined,
        });
      }}
    >
      <p className={styles.settingsHint}>
        Your location stays on your server — it powers weather, holiday and
        local-event awareness.
      </p>
      <div className={styles.settingsFields}>
        <input
          className={styles.settingsInput}
          type="text"
          placeholder="Country"
          value={current.country}
          onChange={set("country")}
          aria-label="Country"
        />
        <input
          className={styles.settingsInput}
          type="text"
          placeholder="State / region"
          value={current.state}
          onChange={set("state")}
          aria-label="State or region"
        />
        <input
          className={styles.settingsInput}
          type="text"
          placeholder="City"
          value={current.city}
          onChange={set("city")}
          aria-label="City"
        />
      </div>
      <div className={styles.settingsActions}>
        <button
          className={styles.moodSubmit}
          type="submit"
          disabled={save.busy}
        >
          {save.busy ? "Saving…" : "Save location"}
        </button>
        <button
          className={styles.settingsCancel}
          type="button"
          onClick={onClose}
        >
          Cancel
        </button>
        {save.failed && (
          <span className={styles.settingsError}>Could not save.</span>
        )}
      </div>
    </form>
  );
}
