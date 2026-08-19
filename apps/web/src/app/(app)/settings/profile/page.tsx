"use client";

import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { useEffect, useState } from "react";
import type { MeResponse } from "@questorylabs/shared";
import { ApiKeyPanel } from "@/components/ApiKeyPanel";
import { Button, PageHeader, Panel } from "@/components/ui";
import { api } from "@/lib/api";
import { useMusicEnabled } from "@/hooks/useMusicEnabled";
import { useUser } from "@/hooks/useUser";
import { useWatchEnabled } from "@/hooks/useWatchEnabled";
import { getMusicUrl } from "@/lib/music";
import { getWatchUrl } from "@/lib/watch";

type PriceRegion = {
  countryCode: string;
  currency: string;
  label: string;
};

export default function ProfileSettingsPage() {
  const store = useStore();
  const music = useMusicEnabled();
  const watch = useWatchEnabled();
  const { user } = useUser();
  const [countryCode, setCountryCode] = useState("IN");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const regions = useResource({
    id: ["price-regions"],
    load: () => api<PriceRegion[]>("/users/price-regions"),
  });

  useEffect(() => {
    const cc = user?.countryCode;
    if (cc) setCountryCode(cc.toUpperCase());
  }, [user?.countryCode]);

  const save = useAction({
    run: async (nextCountry: string) => {
      return api<MeResponse>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ countryCode: nextCountry }),
      });
    },
    onSuccess: (data) => {
      setError(null);
      const currency = data.user?.currency || "USD";
      setMessage(
        `Price region set to ${data.user?.countryCode || "—"} (${currency}).`,
      );
      store.touch(["me"]);
      store.touch(["cost-summary"]);
      store.touch(["cost-roi"]);
      store.touch(["dashboard"]);
      store.touch(["wishlist"]);
      store.touch(["family-insights"]);
      store.touch(["family-library"]);
      store.touch(["library"]);
    },
    onError: (err: Error) => {
      setMessage(null);
      try {
        const parsed = JSON.parse(err.message) as { message?: string | string[] };
        const msg = parsed.message;
        setError(Array.isArray(msg) ? msg.join(", ") : msg || err.message);
      } catch {
        setError(err.message || "Failed to update price region");
      }
    },
  });

  const selected = (regions.value || []).find(
    (r) => r.countryCode === countryCode,
  );
  const dirty =
    (user?.countryCode || "").toUpperCase() !== countryCode;

  return (
    <>
      <PageHeader
        title="Profile"
        description="Set your Steam store price region. This controls Cost, wishlist deals, library value, and family pricing — pick India for INR."
      />

      <Panel wrapperClassName="max-w-lg" className="p-5">
        <h2 className="font-display text-lg font-bold tracking-tight">
          Price region
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {user?.priceRegionLocked
            ? "Locked to your choice — Steam login will not change it."
            : "Currently following Steam account country until you save a choice."}
        </p>

        <label className="mt-4 block text-sm">
          <span className="text-[var(--muted)]">Country / currency</span>
          <select
            value={countryCode}
            onChange={(e) => {
              setCountryCode(e.target.value);
              setMessage(null);
              setError(null);
            }}
            disabled={regions.empty || save.busy}
            className="mt-1.5 w-full rounded-md border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          >
            {(regions.value || [{ countryCode: "IN", currency: "INR", label: "India (INR)" }]).map(
              (r) => (
                <option key={r.countryCode} value={r.countryCode}>
                  {r.label}
                </option>
              ),
            )}
          </select>
        </label>

        {selected && (
          <p className="mt-2 font-mono text-xs text-[var(--faint)]">
            Prices will use {selected.currency}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            disabled={!dirty || save.busy || !countryCode}
            onClick={() => save.submit(countryCode)}
          >
            {save.busy ? "Saving…" : "Save"}
          </Button>
        </div>

        {message && (
          <p className="mt-3 text-sm text-[var(--accent)]">{message}</p>
        )}
        {error && (
          <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>
        )}
      </Panel>

      {music.showMusicNav && (
        <ApiKeyPanel
          type="music_ingest"
          title="Music ingest (ListenBrainz)"
          description="Generate a personal token for multi-scrobbler / ListenBrainz clients."
          endpointHint={`Endpoint: ${getMusicUrl()}/1/`}
        />
      )}

      {watch.showWatchNav && (
        <ApiKeyPanel
          type="watch_webhook"
          title="Watch webhook key"
          description="Personal secret for Plex/Jellyfin webhooks."
          endpointHint={`POST ${getWatchUrl()}/webhooks/plex · ${getWatchUrl()}/webhooks/jellyfin`}
        />
      )}
    </>
  );
}
