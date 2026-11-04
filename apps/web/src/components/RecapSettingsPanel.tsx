"use client";

import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { useState } from "react";
import { Panel } from "@/components/ui";
import { api } from "@/lib/api";

type RecapSettings = { monthly: boolean; global: boolean };

export function RecapSettingsPanel() {
  const store = useStore();
  const [error, setError] = useState<string | null>(null);
  const settings = useResource({
    id: ["recap-settings"],
    load: () => api<RecapSettings>("/recap/settings"),
  });

  const save = useAction({
    run: (monthly: boolean) =>
      api<RecapSettings>("/recap/settings", {
        method: "PUT",
        body: JSON.stringify({ monthly }),
      }),
    onSuccess: () => {
      setError(null);
      void store.touch(["recap-settings"]);
    },
    onError: (err: Error) => setError(err.message || "Failed to save"),
  });

  const value = settings.value;
  return (
    <Panel wrapperClassName="max-w-lg" className="p-5">
      <h2 className="font-display text-lg font-bold tracking-tight">Monthly recap</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        On the 1st, get a notification with last month&apos;s rewind for each area you used.
      </p>
      <label className="mt-4 flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={Boolean(value?.monthly)}
          disabled={!value || value.global || save.busy}
          onChange={(e) => save.submit(e.target.checked)}
        />
        <span>Send me a monthly recap</span>
      </label>
      {value?.global ? (
        <p className="mt-2 text-xs text-[var(--faint)]">Enabled for everyone by your admin.</p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
    </Panel>
  );
}
