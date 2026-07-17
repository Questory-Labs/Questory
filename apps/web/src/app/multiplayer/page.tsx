"use client";

import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { FamilyGameSidebar } from "@/components/FamilyGameSidebar";
import { GameTile } from "@/components/GameTile";
import { api } from "@/lib/api";
import {
  formatPlayerMaxLabel,
  type FriendsListResponse,
  type MultiplayerPlanResponse,
  type MultiplayerPlanSort,
} from "@questorylabs/shared";
import { useMemo, useState } from "react";

const GENRES = [
  "Action",
  "Adventure",
  "Casual",
  "Indie",
  "RPG",
  "Simulation",
  "Strategy",
  "Sports",
  "Racing",
  "Massively Multiplayer",
] as const;

const PLAYER_MIN = 2;
const PLAYER_MAX = 16;
const YEAR_MIN = 2000;
const YEAR_MAX = new Date().getFullYear();

const SORT_OPTIONS: { value: MultiplayerPlanSort; label: string }[] = [
  { value: "popularity", label: "Popularity" },
  { value: "trending", label: "Trending" },
  { value: "release", label: "Release date" },
  { value: "review", label: "Reviews" },
  { value: "name", label: "Name" },
];

export default function MultiplayerPage() {
  const friends = useQuery({
    queryKey: ["friends"],
    queryFn: () => api<FriendsListResponse>("/friends"),
  });
  const friendList = friends.data?.friends || [];

  const [selected, setSelected] = useState<string[]>([]);
  const [friendFilter, setFriendFilter] = useState("");
  const [minPlayers, setMinPlayers] = useState(2);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [minYear, setMinYear] = useState(YEAR_MIN);
  const [maxYear, setMaxYear] = useState(YEAR_MAX);
  const [mode, setMode] = useState<
    "local_coop" | "online_coop" | "pvp" | "crossplay" | ""
  >("");
  const [genre, setGenre] = useState("");
  const [sortBy, setSortBy] = useState<MultiplayerPlanSort>("popularity");
  const [suggested, setSuggested] = useState(false);
  const [strictLibraryMatching, setStrictLibraryMatching] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);

  const filteredFriends = useMemo(() => {
    const q = friendFilter.trim().toLowerCase();
    if (!q) return friendList;
    return friendList.filter(
      (f) =>
        f.personaName.toLowerCase().includes(q) || f.steamId.includes(q),
    );
  }, [friendList, friendFilter]);

  const partyFriends = useMemo(
    () =>
      friendList
        .filter((f) => selected.includes(f.steamId))
        .map((f) => ({
          steamId: f.steamId,
          personaName: f.personaName,
          avatarUrl: f.avatarUrl,
        })),
    [friendList, selected],
  );

  const body = useMemo(
    () => ({
      friendSteamIds: selected,
      minPlayers,
      maxPlayers,
      minYear,
      maxYear,
      mode: mode || undefined,
      genre: genre || undefined,
      sortBy,
      suggested,
      strictLibraryMatching,
    }),
    [
      selected,
      minPlayers,
      maxPlayers,
      minYear,
      maxYear,
      mode,
      genre,
      sortBy,
      suggested,
      strictLibraryMatching,
    ],
  );

  const plan = useQuery({
    queryKey: ["multiplayer-plan", body],
    queryFn: () =>
      api<MultiplayerPlanResponse>("/multiplayer/plan", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const games = plan.data?.games || [];

  return (
    <AppShell>
      <h1
        className="font-[family-name:var(--font-display)] text-4xl"
        style={{ fontWeight: 700 }}
      >
        Multiplayer Planner
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        Find multiplayer games for your group — strict library match, filters, or
        trending suggestions
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
        <div className="space-y-4 rounded-xl border border-[var(--line)] p-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <label className="block text-sm text-[var(--muted)]">
            Sort by
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as MultiplayerPlanSort)
              }
              className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2 text-[var(--ink)]"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <DualRangeFilter
            label="Players"
            tip="Poster shows party/lobby MAX from IGDB (e.g. MAX:3 or MAX:2/4), not match-wide player caps. Unknown capacity stays in the list without a chip."
            display={`${minPlayers}–${maxPlayers}`}
            minBound={PLAYER_MIN}
            maxBound={PLAYER_MAX}
            minValue={minPlayers}
            maxValue={maxPlayers}
            onMinChange={setMinPlayers}
            onMaxChange={setMaxPlayers}
          />

          <DualRangeFilter
            label="Release year"
            display={`${minYear}–${maxYear}`}
            minBound={YEAR_MIN}
            maxBound={YEAR_MAX}
            minValue={minYear}
            maxValue={maxYear}
            onMinChange={setMinYear}
            onMaxChange={setMaxYear}
          />

          <label className="block text-sm text-[var(--muted)]">
            Mode
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
              className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2 text-[var(--ink)]"
            >
              <option value="">Any</option>
              <option value="online_coop">Online Co-op</option>
              <option value="local_coop">Local Co-op</option>
              <option value="pvp">PvP</option>
              <option value="crossplay">Crossplay</option>
            </select>
          </label>

          <label className="block text-sm text-[var(--muted)]">
            Genre
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2 text-[var(--ink)]"
            >
              <option value="">Any</option>
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <input
              type="checkbox"
              checked={strictLibraryMatching}
              onChange={(e) => setStrictLibraryMatching(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            <span className="inline-flex items-center gap-1.5">
              Strict library matching
              <InfoTip text="Only games you and every selected friend own. Off: match other filters without requiring full group ownership." />
            </span>
          </label>

          <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <input
              type="checkbox"
              checked={suggested}
              onChange={(e) => setSuggested(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            <span className="inline-flex items-center gap-1.5">
              Suggested
              <InfoTip text="Include trending multiplayer titles even if someone (or no one) in the group owns them." />
            </span>
          </label>

          <div>
            <div className="mb-2 text-sm text-[var(--muted)]">Friends</div>
            <input
              value={friendFilter}
              onChange={(e) => setFriendFilter(e.target.value)}
              placeholder="Search friends…"
              className="mb-2 w-full rounded-md border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2 text-sm text-[var(--ink)]"
            />
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {filteredFriends.map((f) => (
                <label
                  key={f.steamId}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(f.steamId)}
                    onChange={() => toggle(f.steamId)}
                    className="accent-[var(--accent)]"
                  />
                  {f.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={f.avatarUrl}
                      alt=""
                      className="h-7 w-7 shrink-0 rounded-full"
                    />
                  ) : (
                    <span className="h-7 w-7 shrink-0 rounded-full bg-[var(--bg-2)]" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{f.personaName}</span>
                </label>
              ))}
              {!friends.isLoading && !friendList.length && (
                <p className="text-xs text-[var(--faint)]">
                  Sync friends to intersect libraries.
                </p>
              )}
              {!friends.isLoading &&
                friendList.length > 0 &&
                !filteredFriends.length && (
                  <p className="text-xs text-[var(--faint)]">
                    No friends match “{friendFilter.trim()}”.
                  </p>
                )}
            </div>
          </div>
        </div>

        <div>
          {plan.isLoading && (
            <p className="text-sm text-[var(--muted)]">Finding games…</p>
          )}
          {plan.isError && (
            <p className="text-sm text-[var(--danger)]">
              Could not load multiplayer plan.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {games.map((g, index) => (
              <GameTile
                key={`${g.isSuggested ? "s" : "o"}-${g.appId}`}
                name={g.name}
                headerImage={g.headerImage}
                index={index}
                onClick={() => setSelectedAppId(g.appId)}
                meta={[
                  g.genres.slice(0, 2).join(", ") || null,
                  g.releaseYear ? String(g.releaseYear) : null,
                  g.reviewScore != null ? `★ ${g.reviewScore}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                corner={(() => {
                  const maxes =
                    g.playerMaxes?.length
                      ? g.playerMaxes
                      : g.maxPlayers != null
                        ? [g.maxPlayers]
                        : null;
                  const label = formatPlayerMaxLabel(maxes);
                  if (!label) return undefined;
                  return (
                    <span
                      className="rounded-md bg-[var(--accent)] px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wide text-[#0b1218] shadow-sm"
                      title={
                        g.playerCountSource === "igdb"
                          ? "IGDB mode maxes"
                          : g.playerCountSource === "steam_tag"
                            ? "Steam tag"
                            : undefined
                      }
                    >
                      {label}
                    </span>
                  );
                })()}
                badge={
                  g.isSuggested || g.ownership !== "shared" ? (
                    <OwnershipBadge
                      ownership={g.ownership}
                      ownedByYou={g.ownedByYou}
                      ownedByFriends={g.ownedByFriends}
                      missingFriends={g.missingFriends}
                      isSuggested={g.isSuggested}
                    />
                  ) : undefined
                }
              />
            ))}
          </div>
          {plan.isSuccess && !games.length && (
            <p className="text-sm text-[var(--muted)]">
              No multiplayer titles found for this group. Try fewer friends, turn
              off strict matching, widen filters, or enable Suggested.
            </p>
          )}
        </div>
      </div>

      <FamilyGameSidebar
        appId={selectedAppId}
        onClose={() => setSelectedAppId(null)}
        variant="friends"
        partyFriends={partyFriends}
      />
    </AppShell>
  );
}

function InfoTip({ text }: { text: string }) {
  return (
    <span className="group/tip relative inline-flex">
      <button
        type="button"
        aria-label="More info"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[var(--line)] font-mono text-[10px] leading-none text-[var(--faint)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        i
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-md border border-[var(--line)] bg-[var(--bg-1)] px-2.5 py-2 text-left text-[11px] leading-snug text-[var(--muted)] opacity-0 shadow-lg transition-opacity group-hover/tip:opacity-100 group-focus-within/tip:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

function DualRangeFilter({
  label,
  tip,
  display,
  minBound,
  maxBound,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
}: {
  label: string;
  tip?: string;
  display: string;
  minBound: number;
  maxBound: number;
  minValue: number;
  maxValue: number;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
}) {
  const span = maxBound - minBound || 1;

  function clampMin(value: number) {
    const next = Math.min(Math.max(value, minBound), maxBound);
    onMinChange(next);
    if (next > maxValue) onMaxChange(next);
  }

  function clampMax(value: number) {
    const next = Math.min(Math.max(value, minBound), maxBound);
    onMaxChange(next);
    if (next < minValue) onMinChange(next);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm text-[var(--muted)]">
        <span className="inline-flex items-center gap-1.5">
          {label}
          {tip ? <InfoTip text={tip} /> : null}
        </span>
        <span className="font-mono text-[var(--ink)]">{display}</span>
      </div>
      <div className="relative h-6">
        <div className="pointer-events-none absolute top-1/2 right-0 left-0 h-1 -translate-y-1/2 rounded-full bg-[var(--bg-3)]" />
        <div
          className="pointer-events-none absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[var(--accent)]"
          style={{
            left: `${((minValue - minBound) / span) * 100}%`,
            right: `${((maxBound - maxValue) / span) * 100}%`,
          }}
        />
        <input
          type="range"
          aria-label={`Minimum ${label.toLowerCase()}`}
          min={minBound}
          max={maxBound}
          value={minValue}
          onChange={(e) => clampMin(Number(e.target.value))}
          className="dual-range absolute inset-0 z-[1] w-full"
        />
        <input
          type="range"
          aria-label={`Maximum ${label.toLowerCase()}`}
          min={minBound}
          max={maxBound}
          value={maxValue}
          onChange={(e) => clampMax(Number(e.target.value))}
          className="dual-range absolute inset-0 z-[2] w-full"
        />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-[var(--faint)]">
        <span>{minBound}</span>
        <span>{maxBound}</span>
      </div>
    </div>
  );
}

function OwnershipBadge({
  ownership,
  ownedByYou,
  ownedByFriends,
  missingFriends,
  isSuggested,
}: {
  ownership: "shared" | "partial" | "unowned";
  ownedByYou: boolean;
  ownedByFriends: string[];
  missingFriends: string[];
  isSuggested: boolean;
}) {
  const prefix = isSuggested ? "Suggested · " : "";

  if (ownership === "unowned") {
    return (
      <div className="space-y-0.5">
        <span className="inline-block rounded bg-[var(--warm)]/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1a1410]">
          {prefix}Not owned
        </span>
      </div>
    );
  }

  const owners = [
    ...(ownedByYou ? ["You"] : []),
    ...ownedByFriends.slice(0, 2),
  ];
  const ownerLabel = owners.length ? owners.join(", ") : "Partial";
  const missing =
    missingFriends.length > 0
      ? `Missing: ${missingFriends.slice(0, 2).join(", ")}${
          missingFriends.length > 2 ? ` +${missingFriends.length - 2}` : ""
        }`
      : ownedByYou
        ? null
        : "You don’t own";

  return (
    <div className="space-y-0.5">
      <span className="inline-block rounded bg-[var(--accent)]/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0b1218]">
        {prefix}
        {ownerLabel}
      </span>
      {missing ? (
        <div className="text-[10px] font-medium text-white/90">{missing}</div>
      ) : null}
    </div>
  );
}
