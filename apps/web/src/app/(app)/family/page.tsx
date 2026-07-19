"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StatCard } from "@/components/StatCard";
import { GameTile } from "@/components/GameTile";
import { FamilyGameSidebar } from "@/components/FamilyGameSidebar";
import { Button, PageHeader, Panel } from "@/components/ui";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import type {
  FamilyInsights,
  FamilyLibrary,
  FriendsListResponse,
} from "@questorylabs/shared";
import { useMemo, useState } from "react";

function parseApiError(err: Error) {
  try {
    const parsed = JSON.parse(err.message) as { message?: string | string[] };
    const msg = parsed.message;
    if (Array.isArray(msg)) return msg.join(", ");
    return msg || err.message;
  } catch {
    return err.message || "Request failed";
  }
}

function memberLabel(m: {
  personaName: string;
  isMe?: boolean;
  steamId: string;
}) {
  const name =
    m.personaName === m.steamId || m.personaName === `Steam ${m.steamId}`
      ? "Steam user"
      : m.personaName;
  return m.isMe ? `${name} (me)` : name;
}

export default function FamilyPage() {
  const qc = useQueryClient();
  const [steamId, setSteamId] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showImport, setShowImport] = useState(false);
  const [importFilter, setImportFilter] = useState("");
  const [activeMember, setActiveMember] = useState<string>("all");
  const [gameSearch, setGameSearch] = useState("");
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const insights = useQuery({
    queryKey: ["family-insights"],
    queryFn: () => api<FamilyInsights>("/family/insights"),
  });

  const libraryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (activeMember !== "all") p.set("memberSteamId", activeMember);
    if (gameSearch.trim()) p.set("q", gameSearch.trim());
    p.set("page", String(page));
    p.set("pageSize", "48");
    return p.toString();
  }, [activeMember, gameSearch, page]);

  const library = useQuery({
    queryKey: ["family-library", libraryParams],
    queryFn: () => api<FamilyLibrary>(`/family/library?${libraryParams}`),
  });

  const friends = useQuery({
    queryKey: ["friends"],
    queryFn: () => api<FriendsListResponse>("/friends"),
    enabled: showImport,
  });

  const members = insights.data?.members || library.data?.members || [];
  const memberIds = useMemo(
    () => new Set(members.map((m) => m.steamId)),
    [members],
  );

  const importable = useMemo(() => {
    const list = (friends.data?.friends || []).filter(
      (f) => !memberIds.has(f.steamId),
    );
    const q = importFilter.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (f) =>
        f.personaName.toLowerCase().includes(q) || f.steamId.includes(q),
    );
  }, [friends.data, memberIds, importFilter]);

  const invalidateFamily = () => {
    qc.invalidateQueries({ queryKey: ["family-insights"] });
    qc.invalidateQueries({ queryKey: ["family-library"] });
  };

  const add = useMutation({
    mutationFn: () =>
      api("/family/members", {
        method: "POST",
        body: JSON.stringify({ steamId: steamId.trim() }),
      }),
    onSuccess: () => {
      setSteamId("");
      setAddError(null);
      invalidateFamily();
    },
    onError: (err: Error) => setAddError(parseApiError(err)),
  });

  const importFriends = useMutation({
    mutationFn: (steamIds: string[]) =>
      api<{ added: number; skipped: number }>("/family/members/import", {
        method: "POST",
        body: JSON.stringify({ steamIds }),
      }),
    onSuccess: () => {
      setSelected(new Set());
      setShowImport(false);
      setImportFilter("");
      setAddError(null);
      invalidateFamily();
    },
    onError: (err: Error) => setAddError(parseApiError(err)),
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    const ids = importable.map((f) => f.steamId);
    const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const id of ids) next.delete(id);
      } else {
        for (const id of ids) next.add(id);
      }
      return next;
    });
  };

  const d = insights.data;
  const currency = d?.currency || "USD";
  const money = (n: number | null | undefined) => formatMoney(n, currency);
  const totalPages = library.data
    ? Math.max(1, Math.ceil(library.data.total / library.data.pageSize))
    : 1;

  return (
    <>
      <PageHeader
        title="Family Dashboard"
        description="Browse shareable family games by member, with ownership and price stats"
      />

      <div className="flex flex-wrap items-end gap-2">
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (steamId.trim()) add.mutate();
          }}
        >
          <input
            value={steamId}
            onChange={(e) => {
              setSteamId(e.target.value);
              setAddError(null);
            }}
            placeholder="Add member SteamID64"
            className="min-w-[260px] rounded-md border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2 text-sm"
          />
          <Button
            type="submit"
            disabled={add.isPending || !steamId.trim()}
          >
            {add.isPending ? "Adding…" : "Add member"}
          </Button>
        </form>
        <Button
          variant="secondary"
          onClick={() => setShowImport((v) => !v)}
        >
          {showImport ? "Hide friends" : "Import from friends"}
        </Button>
      </div>
      {addError && (
        <p className="mt-2 text-sm text-[var(--danger)]">{addError}</p>
      )}

      {showImport && (
        <Panel className="mt-6 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold tracking-tight">
              Import from friends
            </h2>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={toggleAllVisible}
                disabled={!importable.length}
                className="px-3 py-1.5 text-xs"
              >
                {importable.length &&
                importable.every((f) => selected.has(f.steamId))
                  ? "Deselect all"
                  : "Select all"}
              </Button>
              <Button
                disabled={selected.size === 0 || importFriends.isPending}
                onClick={() => importFriends.mutate([...selected])}
                className="px-3 py-1.5 text-xs"
              >
                {importFriends.isPending
                  ? "Importing…"
                  : `Add selected (${selected.size})`}
              </Button>
            </div>
          </div>

          <input
            value={importFilter}
            onChange={(e) => setImportFilter(e.target.value)}
            placeholder="Filter friends…"
            className="mt-3 w-full max-w-md rounded-md border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2 text-sm"
          />

          <div className="mt-4 max-h-72 space-y-1 overflow-y-auto">
            {friends.isLoading && (
              <p className="text-sm text-[var(--muted)]">Loading friends…</p>
            )}
            {!friends.isLoading && !importable.length && (
              <p className="text-sm text-[var(--muted)]">
                {(friends.data?.friends || []).length === 0
                  ? "No friends synced yet. Open Friends or refresh sync first."
                  : "All synced friends are already in your family group."}
              </p>
            )}
            {importable.map((f) => {
              const checked = selected.has(f.steamId);
              return (
                <label
                  key={f.steamId}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-[var(--bg-2)]"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(f.steamId)}
                    className="accent-[var(--accent)]"
                  />
                  {f.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={f.avatarUrl}
                      alt=""
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <span className="h-8 w-8 rounded-full bg-[var(--bg-2)]" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{f.personaName}</span>
                </label>
              );
            })}
          </div>
        </Panel>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Members"
          value={insights.isLoading ? "…" : (d?.memberCount ?? "—")}
          hint="People in this family group"
        />
        <StatCard
          label="Unique games"
          value={insights.isLoading ? "…" : (d?.totalUniqueGames ?? "—")}
          hint="Distinct titles across all libraries"
        />
        <StatCard
          label="Overlaps"
          value={insights.isLoading ? "…" : (d?.overlapCount ?? "—")}
          hint="Games owned by 2+ members (duplicate licenses)"
        />
        <StatCard
          label="Library value"
          value={insights.isLoading ? "…" : d ? money(d.familyValue) : "—"}
          hint="Unique titles across family sharing — recorded prices when set, otherwise store prices"
        />
      </div>

      <section className="panel-outline mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-3 py-3 font-medium tabular-nums">Games</th>
              <th className="px-3 py-3 font-medium tabular-nums">Shared</th>
              <th className="px-3 py-3 font-medium tabular-nums">Unique</th>
              <th className="px-3 py-3 font-medium tabular-nums">Value</th>
              <th className="px-3 py-3 font-medium tabular-nums">Wishlist gaps</th>
              <th className="px-3 py-3 font-medium tabular-nums">Unplayed</th>
              <th className="px-3 py-3 font-medium tabular-nums">Hours</th>
            </tr>
          </thead>
          <tbody>
            {insights.isLoading && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-6 text-[var(--muted)]"
                >
                  Loading member stats…
                </td>
              </tr>
            )}
            {!insights.isLoading && !members.length && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-6 text-[var(--muted)]"
                >
                  No members yet. Import friends or add a SteamID64 above.
                </td>
              </tr>
            )}
            {(d?.members || []).map((m) => (
              <tr
                key={m.steamId}
                className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--bg-2)]"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {m.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.avatarUrl}
                        alt=""
                        className="h-7 w-7 rounded-full"
                      />
                    ) : (
                      <span className="h-7 w-7 rounded-full bg-[var(--bg-2)]" />
                    )}
                    <span className="truncate font-medium">
                      {memberLabel(m)}
                    </span>
                    {d?.suggestedPurchaser?.steamId === m.steamId && (
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-[var(--accent)]">
                        next buyer
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 font-mono tabular-nums">
                  {m.librarySize}
                </td>
                <td className="px-3 py-3 font-mono tabular-nums">
                  {m.sharedCount ?? "—"}
                </td>
                <td className="px-3 py-3 font-mono tabular-nums">
                  {m.uniqueCount ?? "—"}
                </td>
                <td className="px-3 py-3 font-mono tabular-nums">
                  {m.trackedSpend != null ? money(m.trackedSpend) : "—"}
                </td>
                <td className="px-3 py-3 font-mono tabular-nums">
                  {m.wishlistGaps ?? "—"}
                </td>
                <td className="px-3 py-3 font-mono tabular-nums">
                  {m.unusedCount ?? "—"}
                </td>
                <td className="px-3 py-3 font-mono tabular-nums">
                  {m.playtimeHours != null ? `${m.playtimeHours}h` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight">
              Family shareable games
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {library.isLoading
                ? "Loading…"
                : `${library.data?.total ?? 0} games · click a poster for stats`}
            </p>
          </div>
          <input
            value={gameSearch}
            onChange={(e) => {
              setGameSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search games"
            className="min-w-[220px] rounded-md border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => {
              setActiveMember("all");
              setPage(1);
            }}
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm ${
              activeMember === "all"
                ? "bg-[var(--accent)] font-semibold text-[var(--bg-0)]"
                : "border border-[var(--line)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--ink)]"
            }`}
          >
            All
          </button>
          {members.map((m) => (
            <button
              key={m.steamId}
              type="button"
              onClick={() => {
                setActiveMember(m.steamId);
                setPage(1);
              }}
              className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm ${
                activeMember === m.steamId
                  ? "bg-[var(--accent)] font-semibold text-[var(--bg-0)]"
                  : "border border-[var(--line)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--ink)]"
              }`}
            >
              {m.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.avatarUrl}
                  alt=""
                  className="h-5 w-5 rounded-full"
                />
              ) : null}
              {memberLabel(m)}
            </button>
          ))}
        </div>

        {!insights.isLoading && !members.length && (
          <p className="text-sm text-[var(--muted)]">
            No members yet. Import friends or add a SteamID64 above.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(library.data?.items || []).map((item, index) => (
            <GameTile
              key={item.appId}
              name={item.name}
              headerImage={item.headerImage}
              index={index}
              onClick={() => setSelectedAppId(item.appId)}
              badge={
                <div className="flex items-end justify-between gap-2 text-[11px] text-[var(--ink)]">
                  <span className="font-medium">
                    {item.ownerCount} family
                    {item.ownerCount === 1 ? " owner" : " owners"}
                  </span>
                  <span className="font-mono text-[10px] text-white/75">
                    {item.familyPlaytimeHours}h
                  </span>
                </div>
              }
              meta={
                item.currentPrice != null
                  ? `${money(item.currentPrice)}${
                      item.lowestPrice != null
                        ? ` · low ${money(item.lowestPrice)}`
                        : ""
                    }`
                  : item.owners
                      .slice(0, 2)
                      .map((o) => (o.isMe ? `${o.personaName} (me)` : o.personaName))
                      .join(" · ") || undefined
              }
            />
          ))}
        </div>

        {library.isLoading && (
          <p className="mt-4 text-sm text-[var(--muted)]">Loading games…</p>
        )}
        {!library.isLoading && library.data && library.data.total === 0 && (
          <p className="mt-4 text-sm text-[var(--muted)]">
            No shareable games for this filter. Sync libraries or try another
            member.
          </p>
        )}

        {library.data && library.data.total > library.data.pageSize && (
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
      </section>

      <section className="mt-12">
        <h2 className="mb-4 font-display text-xl font-bold tracking-tight">
          License conflicts
        </h2>
        <p className="mb-3 text-sm text-[var(--muted)]">
          Games owned by more than one family member
        </p>
        <div className="space-y-2">
          {(d?.conflicts || []).map((c) => (
            <button
              key={c.appId}
              type="button"
              onClick={() => setSelectedAppId(c.appId)}
              className="panel-outline flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:border-[var(--accent)]"
            >
              <span>{c.name}</span>
              <span className="text-[var(--muted)]">
                {c.owners.join(", ")}
              </span>
            </button>
          ))}
          {!insights.isLoading && d && !(d.conflicts || []).length && (
            <p className="text-sm text-[var(--muted)]">
              No overlapping games between members yet.
            </p>
          )}
        </div>
      </section>

      <FamilyGameSidebar
        appId={selectedAppId}
        onClose={() => setSelectedAppId(null)}
      />
    </>
  );
}
