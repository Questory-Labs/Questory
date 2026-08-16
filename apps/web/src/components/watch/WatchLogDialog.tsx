"use client";

import { useEffect, useState } from "react";
import { useAction, useStore } from "@questorylabs/qhttp/react";
import type {
  WatchCatalogLog,
  WatchCatalogLogResult,
  WatchCatalogSearchHit,
  WatchCatalogSearchResponse,
} from "@questorylabs/shared";
import { Button, DateField, Dialog, StarRating } from "@/components/ui";
import { localDayKey } from "@/lib/dates";
import {
  WATCH_LOG_SEARCH_DEBOUNCE_MS,
  watchFetch,
} from "@/lib/watch";

type WatchLogDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function WatchLogDialog({ open, onClose }: WatchLogDialogProps) {
  const store = useStore();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<WatchCatalogSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<WatchCatalogSearchHit | null>(null);
  const [seasonNumber, setSeasonNumber] = useState("1");
  const [episodeNumber, setEpisodeNumber] = useState("1");
  const [rating, setRating] = useState<number | null>(null);
  const [watchedAt, setWatchedAt] = useState(localDayKey(new Date().toISOString()));
  const [formError, setFormError] = useState<string | null>(null);

  const log = useAction({
    run: (body: WatchCatalogLog) =>
      watchFetch<WatchCatalogLogResult>("/catalog/log", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      store.touch([
        ["watch-insights"],
        ["watch-recent"],
        ["watch-ts-hour"],
        ["watch-ts-dow"],
        ["watch-years"],
        ["watch-sources"],
      ]);
      onClose();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHits([]);
    setSearching(false);
    setSearchError(null);
    setSelected(null);
    setSeasonNumber("1");
    setEpisodeNumber("1");
    setRating(null);
    setWatchedAt(localDayKey(new Date().toISOString()));
    setFormError(null);
  }, [open]);

  useEffect(() => {
    if (!open || selected) return;
    const q = query.trim();
    if (q.length === 0) {
      setHits([]);
      setSearching(false);
      setSearchError(null);
      return;
    }
    setSearching(true);
    const timer = window.setTimeout(() => {
      void watchFetch<WatchCatalogSearchResponse>(
        `/catalog/search?q=${encodeURIComponent(q)}`,
      )
        .then((res) => {
          setHits(res.items);
          setSearchError(null);
        })
        .catch((err: unknown) => {
          setHits([]);
          setSearchError(err instanceof Error ? err.message : "Search failed");
        })
        .finally(() => setSearching(false));
    }, WATCH_LOG_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [open, query, selected]);

  function submit() {
    if (!selected) return;
    if (selected.type === "show") {
      const season = Number(seasonNumber);
      const episode = Number(episodeNumber);
      if (!Number.isInteger(season) || !Number.isInteger(episode)) {
        setFormError("Enter a season and episode number");
        return;
      }
    }
    const body: WatchCatalogLog = {
      type: selected.type,
      watchedAt,
      rating,
      tmdbId: selected.tmdbId,
      anilistId: selected.anilistId,
      ...(selected.type === "show"
        ? {
            seasonNumber: Number(seasonNumber),
            episodeNumber: Number(episodeNumber),
          }
        : {}),
    };
    setFormError(null);
    log.submit(body);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={selected ? "Log watch" : "Add watch"}
      className="max-w-xl"
    >
      {selected ? (
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <SelectedTitle hit={selected} />
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setFormError(null);
              }}
              className="ml-auto shrink-0 pt-1 text-xs text-[var(--muted)] hover:text-[var(--ink)]"
            >
              Change
            </button>
          </div>
          {selected.type === "show" ? (
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Season"
                value={seasonNumber}
                min={0}
                onChange={setSeasonNumber}
              />
              <NumberField
                label="Episode"
                value={episodeNumber}
                min={1}
                onChange={setEpisodeNumber}
              />
            </div>
          ) : null}
          <div className="grid grid-cols-[minmax(0,1fr)_11.5rem] items-start gap-6">
            <div className="min-w-0">
              <p className="text-xs text-[var(--muted)]">Rating</p>
              <div className="mt-1.5">
                <StarRating value={rating} onChange={setRating} />
              </div>
            </div>
            <DateField label="Date" value={watchedAt} onChange={setWatchedAt} />
          </div>
          {formError ? (
            <p className="text-sm text-[var(--danger)]">{formError}</p>
          ) : null}
          <div className="-mx-5 -mb-4 flex justify-end gap-2 border-t border-[var(--line)] px-5 py-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={log.busy}>
              {log.busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-xs text-[var(--muted)]">Search</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Movie, series, anime, drama…"
              autoFocus
              className="mt-1 w-full rounded border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2 text-sm"
            />
          </label>
          {searching ? (
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">
              Searching…
            </p>
          ) : null}
          {searchError ? (
            <p className="text-sm text-[var(--danger)]">{searchError}</p>
          ) : null}
          {!searching && query.trim() && hits.length === 0 && !searchError ? (
            <p className="text-sm text-[var(--muted)]">No matches.</p>
          ) : null}
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {hits.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  onClick={() => setSelected(hit)}
                  className="flex w-full items-center gap-3 rounded px-2 py-2 text-left hover:bg-[var(--bg-2)]"
                >
                  {hit.posterUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={hit.posterUrl}
                      alt=""
                      className="h-14 w-10 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <span className="h-14 w-10 shrink-0 rounded bg-[var(--bg-2)]" />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-[var(--ink)]">
                      {hit.name}
                      {hit.year != null ? ` (${hit.year})` : ""}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      <SourceChip>
                        {hit.type === "movie" ? "Movie" : "TV"}
                      </SourceChip>
                      {hit.sources.map((source) => (
                        <SourceChip key={source}>
                          {source === "tmdb" ? "TMDB" : "AniList"}
                        </SourceChip>
                      ))}
                      {hit.originCountry ? (
                        <SourceChip>{hit.originCountry}</SourceChip>
                      ) : null}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Dialog>
  );
}

function SelectedTitle({ hit }: { hit: WatchCatalogSearchHit }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      {hit.posterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={hit.posterUrl}
          alt=""
          className="h-16 w-11 shrink-0 rounded object-cover"
        />
      ) : null}
      <div className="min-w-0">
        <p className="truncate font-display text-lg">{hit.name}</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">
          {hit.type === "movie" ? "Movie" : "TV"}
          {hit.year != null ? ` · ${hit.year}` : ""}
        </p>
      </div>
    </div>
  );
}

function SourceChip({ children }: { children: string }) {
  return (
    <span className="rounded bg-[var(--bg-2)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
      {children}
    </span>
  );
}

function NumberField({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: string;
  min: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="text-xs text-[var(--muted)]">{label}</span>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded border border-[var(--line)] bg-[var(--bg-2)] px-2.5 py-1.5 text-sm"
      />
    </label>
  );
}
