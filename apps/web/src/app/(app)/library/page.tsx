"use client";

import { useResource } from "@questorylabs/qhttp/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GameTile } from "@/components/GameTile";
import { StoreBadgeRow } from "@/components/StoreBadge";
import { Button, EmptyState, PageHeader, SkeletonTileGrid } from "@/components/ui";
import { api } from "@/lib/api";
import { useSyncJobs } from "@/hooks/useSyncJobs";
import { useMemo, useState, Suspense } from "react";
import type { Store } from "@questorylabs/shared";

type LibraryResponse = {
  total: number;
  page: number;
  pageSize: number;
  items: {
    playtimeForever: number;
    stores?: Store[];
    game: {
      id: string;
      appId: number | null;
      name: string;
      headerImage: string | null;
      genres: string[];
      stores?: Store[];
    };
  }[];
};

const STORE_CHIPS: { id: Store | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "steam", label: "Steam" },
  { id: "epic", label: "Epic" },
  { id: "gog", label: "GOG" },
];

function LibraryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeParam = searchParams.get("store");
  const activeStore =
    storeParam === "steam" || storeParam === "epic" || storeParam === "gog"
      ? storeParam
      : "all";

  const [q, setQ] = useState("");
  const [genre, setGenre] = useState("");
  const [unplayed, setUnplayed] = useState(false);
  const [multiplayer, setMultiplayer] = useState(false);
  const [deck, setDeck] = useState(false);
  const [page, setPage] = useState(1);

  const setStore = (store: Store | "all") => {
    setPage(1);
    const p = new URLSearchParams(searchParams.toString());
    if (store === "all") p.delete("store");
    else p.set("store", store);
    const qs = p.toString();
    router.replace(qs ? `/library?${qs}` : "/library");
  };

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (genre) p.set("genre", genre);
    if (unplayed) p.set("unplayed", "true");
    if (multiplayer) p.set("multiplayer", "true");
    if (deck) p.set("deck", "true");
    if (activeStore !== "all") p.set("store", activeStore);
    p.set("page", String(page));
    p.set("pageSize", "48");
    return p.toString();
  }, [q, genre, unplayed, multiplayer, deck, activeStore, page]);

  const sync = useSyncJobs();
  const library = useResource({
    id: ["library", params],
    load: () => api<LibraryResponse>(`/library?${params}`),
    refreshEvery: sync.active ? 3_000 : false,
  });

  const totalPages = library.value
    ? Math.max(1, Math.ceil(library.value.total / library.value.pageSize))
    : 1;

  return (
    <>
      <PageHeader
        title="Library"
        description={
          sync.active
            ? `Syncing · ${sync.doneCount}/${sync.total}${
                sync.current ? ` · ${sync.current.label}` : ""
              }`
            : `${library.value?.total ?? 0} games`
        }
        actions={
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Search games"
            className="rounded-md border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2 text-sm outline-none"
          />
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {STORE_CHIPS.map((chip) => {
          const active = activeStore === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => setStore(chip.id)}
              className={`rounded-md border px-3 py-1.5 text-sm transition ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--ink)]"
                  : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <div className="mb-6 flex flex-wrap gap-3 text-sm">
        <input
          value={genre}
          onChange={(e) => {
            setPage(1);
            setGenre(e.target.value);
          }}
          placeholder="Genre"
          className="rounded-md border border-[var(--line)] bg-[var(--bg-2)] px-3 py-1.5"
        />
        <label className="flex items-center gap-2 text-[var(--muted)]">
          <input
            type="checkbox"
            checked={unplayed}
            onChange={(e) => {
              setPage(1);
              setUnplayed(e.target.checked);
            }}
          />
          Unplayed
        </label>
        <label className="flex items-center gap-2 text-[var(--muted)]">
          <input
            type="checkbox"
            checked={multiplayer}
            onChange={(e) => {
              setPage(1);
              setMultiplayer(e.target.checked);
            }}
          />
          Multiplayer
        </label>
        <label className="flex items-center gap-2 text-[var(--muted)]">
          <input
            type="checkbox"
            checked={deck}
            onChange={(e) => {
              setPage(1);
              setDeck(e.target.checked);
            }}
          />
          Deck ready
        </label>
      </div>

      {library.empty ? (
        <SkeletonTileGrid count={12} className="mb-6" />
      ) : (library.value?.items || []).length === 0 ? (
        <EmptyState
          title={
            sync.active
              ? "Steam library sync is still running…"
              : "No games match these filters."
          }
          description={
            sync.active ? (
              <span className="text-[var(--muted)]">
                {sync.current
                  ? `${sync.current.label} in progress`
                  : "Games will appear here as the sync finishes."}
              </span>
            ) : (
              <Link
                href="/settings/connections"
                className="text-[var(--accent)] hover:underline"
              >
                Check Connections
              </Link>
            )
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(library.value?.items || []).map((item, i) => {
              const stores = item.stores || item.game.stores || [];
              return (
                <Link
                  key={item.game.id}
                  href={`/library/${item.game.id}`}
                  className="block h-full"
                >
                  <GameTile
                    name={item.game.name}
                    headerImage={item.game.headerImage}
                    meta={`${Math.round(item.playtimeForever / 60)}h · ${item.game.genres.slice(0, 2).join(", ") || "—"}`}
                    index={i}
                    corner={
                      stores.length ? <StoreBadgeRow stores={stores} /> : undefined
                    }
                  />
                </Link>
              );
            })}
          </div>

          {library.value && library.value.total > library.value.pageSize && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5"
              >
                Previous
              </Button>
              <span className="font-mono text-xs text-[var(--muted)]">
                {page} / {totalPages}
              </span>
              <Button
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}

export default function LibraryPage() {
  return (
    <>
      <Suspense
        fallback={<SkeletonTileGrid count={8} />}
      >
        <LibraryContent />
      </Suspense>
    </>
  );
}
