"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ApiKeyPanel } from "@/components/ApiKeyPanel";
import { Button, PageHeader, Panel } from "@/components/ui";
import { api } from "@/lib/api";
import { useMusicEnabled } from "@/hooks/useMusicEnabled";
import { useWatchEnabled } from "@/hooks/useWatchEnabled";
import { MUSIC_URL } from "@/lib/music";
import { WATCH_URL } from "@/lib/watch";

type PriceRegion = {
  countryCode: string;
  currency: string;
  label: string;
};

type MeResponse = {
  user: {
    id: string;
    personaName: string;
    countryCode?: string | null;
    priceRegionLocked?: boolean;
    currency?: string;
  } | null;
};

export default function ProfileSettingsPage() {
  const qc = useQueryClient();
  const music = useMusicEnabled();
  const watch = useWatchEnabled();
  const [countryCode, setCountryCode] = useState("IN");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<MeResponse>("/auth/me"),
  });

  const regions = useQuery({
    queryKey: ["price-regions"],
    queryFn: () => api<PriceRegion[]>("/users/price-regions"),
  });

  useEffect(() => {
    const cc = me.data?.user?.countryCode;
    if (cc) setCountryCode(cc.toUpperCase());
  }, [me.data?.user?.countryCode]);

  const save = useMutation({
    mutationFn: async (nextCountry: string) => {
      const updated = await api<MeResponse>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ countryCode: nextCountry }),
      });
      await api("/cost/refresh-prices", { method: "POST" });
      return updated;
    },
    onSuccess: (data) => {
      setError(null);
      const currency = data.user?.currency || "USD";
      setMessage(
        `Price region set to ${data.user?.countryCode || "—"} (${currency}). Refreshing store prices…`,
      );
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["cost-summary"] });
      qc.invalidateQueries({ queryKey: ["cost-roi"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["wishlist"] });
      qc.invalidateQueries({ queryKey: ["family-insights"] });
      qc.invalidateQueries({ queryKey: ["family-library"] });
      qc.invalidateQueries({ queryKey: ["library"] });
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

  const selected = (regions.data || []).find(
    (r) => r.countryCode === countryCode,
  );
  const dirty =
    (me.data?.user?.countryCode || "").toUpperCase() !== countryCode;

  return (
    <>
      <PageHeader
        title="Profile"
        description="Set your Steam store price region. This controls Cost, wishlist deals, library value, and family pricing — pick India for INR."
      />

      <Panel elevated className="max-w-lg" faceClassName="p-5">
        <h2 className="font-display text-lg font-bold tracking-tight">
          Price region
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {me.data?.user?.priceRegionLocked
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
            disabled={regions.isLoading || save.isPending}
            className="mt-1.5 w-full rounded-md border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          >
            {(regions.data || [{ countryCode: "IN", currency: "INR", label: "India (INR)" }]).map(
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
            disabled={!dirty || save.isPending || !countryCode}
            onClick={() => save.mutate(countryCode)}
          >
            {save.isPending ? "Saving & refreshing…" : "Save & refresh prices"}
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
          endpointHint={`Endpoint: ${MUSIC_URL}/1/`}
        />
      )}

      {watch.showWatchNav && (
        <ApiKeyPanel
          type="watch_webhook"
          title="Watch webhook key"
          description="Personal secret for Plex/Jellyfin webhooks."
          endpointHint={`POST ${WATCH_URL}/webhooks/plex · ${WATCH_URL}/webhooks/jellyfin`}
        />
      )}
    </>
  );
}
