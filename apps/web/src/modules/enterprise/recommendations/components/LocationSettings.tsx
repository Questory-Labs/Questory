"use client";

import { useState } from "react";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { fetchSettings, saveSettings } from "@/lib/enterprise-api";

const INPUT_CLASS =
  "min-h-10 flex-[1_1_160px] rounded-full border border-[var(--line)] bg-black/30 px-4 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--faint)] focus:border-[var(--line-strong)]";

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
      className="panel q-in flex flex-col gap-3 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        save.submit({
          country: current.country.trim() || undefined,
          state: current.state.trim() || undefined,
          city: current.city.trim() || undefined,
        });
      }}
    >
      <p className="text-sm text-[var(--muted)]">
        Your location stays on your server — it powers weather, holiday and
        local-event awareness.
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          className={INPUT_CLASS}
          type="text"
          placeholder="Country"
          value={current.country}
          onChange={set("country")}
          aria-label="Country"
        />
        <input
          className={INPUT_CLASS}
          type="text"
          placeholder="State / region"
          value={current.state}
          onChange={set("state")}
          aria-label="State or region"
        />
        <input
          className={INPUT_CLASS}
          type="text"
          placeholder="City"
          value={current.city}
          onChange={set("city")}
          aria-label="City"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="min-h-10 rounded-full bg-[linear-gradient(180deg,#f2dca8,#d9b066)] px-5 text-sm font-medium text-[#17140e] transition-transform duration-500 hover:-translate-y-0.5 disabled:opacity-60"
          type="submit"
          disabled={save.busy}
        >
          {save.busy ? "Saving…" : "Save location"}
        </button>
        <button
          className="min-h-10 rounded-full border border-white/[0.12] px-4 text-sm text-[var(--ink)]"
          type="button"
          onClick={onClose}
        >
          Cancel
        </button>
        {save.failed && (
          <span className="text-sm text-[var(--danger)]">Could not save.</span>
        )}
      </div>
    </form>
  );
}
