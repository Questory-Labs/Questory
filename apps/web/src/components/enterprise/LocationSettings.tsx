"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSettings, saveSettings } from "@/lib/enterprise-api";
import styles from "./recommendations.module.css";

/**
 * Small country/state/city form. Location powers weather, holidays and
 * local-event awareness; the engine geocodes on save. Unset → the world
 * strip shows a "Set your location" hint that opens this form.
 */
export function LocationSettings({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: ["enterprise-settings"],
    queryFn: fetchSettings,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const [draft, setDraft] = useState<{
    country: string;
    state: string;
    city: string;
  } | null>(null);

  const save = useMutation({
    mutationFn: saveSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(["enterprise-settings"], data);
      onClose();
    },
  });

  if (!open) return null;

  const current = draft ?? {
    country: settings.data?.country ?? "",
    state: settings.data?.state ?? "",
    city: settings.data?.city ?? "",
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
        save.mutate({
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
          disabled={save.isPending}
        >
          {save.isPending ? "Saving…" : "Save location"}
        </button>
        <button
          className={styles.settingsCancel}
          type="button"
          onClick={onClose}
        >
          Cancel
        </button>
        {save.isError && (
          <span className={styles.settingsError}>Could not save.</span>
        )}
      </div>
    </form>
  );
}
