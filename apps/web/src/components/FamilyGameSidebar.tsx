"use client";

import { useResource } from "@questorylabs/qhttp/react";
import { api } from "@/lib/api";
import type { FamilyGameDetail, GameDetail } from "@questorylabs/shared";
import { useEffect } from "react";
import {
  GameDetailStats,
  OwnerRow,
  SectionTitle,
} from "@/components/GameDetailStats";
import { Button } from "@/components/ui";

export function FamilyGameSidebar({
  appId,
  onClose,
  variant = "family",
  partyFriends = [],
}: {
  appId: number | null;
  onClose: () => void;
  /** family = family owners + friends; friends = you + friends only */
  variant?: "family" | "friends";
  /** Selected multiplayer party — used to show who is missing the game */
  partyFriends?: Array<{
    steamId: string;
    personaName: string;
    avatarUrl: string | null;
  }>;
}) {
  const detail = useResource({
    id: ["game-detail", variant, appId],
    load: () =>
      variant === "friends"
        ? api<GameDetail>(`/games/${appId}`)
        : api<FamilyGameDetail>(`/family/games/${appId}`),
    when: appId != null,
  });

  useEffect(() => {
    if (appId == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [appId, onClose]);

  if (appId == null) return null;

  const d = detail.value;
  const familyDetail = variant === "family" ? (d as FamilyGameDetail) : null;
  const friendsDetail = d as GameDetail | undefined;
  const partyOwnerIds = new Set(
    (friendsDetail?.friendOwners || []).map((o) => o.steamId),
  );
  const missingFromParty =
    variant === "friends" && partyFriends.length > 0 && friendsDetail
      ? [
          ...(!friendsDetail.youOwn
            ? [
                {
                  steamId: "you",
                  personaName: "You",
                  avatarUrl: null as string | null,
                  isMe: true,
                },
              ]
            : []),
          ...partyFriends
            .filter((f) => !partyOwnerIds.has(f.steamId))
            .map((f) => ({ ...f, isMe: false })),
        ]
      : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close game details"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-[var(--line)] bg-[var(--bg-1)] shadow-[-12px_0_40px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
              Game details
            </p>
            <h2 className="mt-1 truncate font-display text-xl font-bold tracking-tight">
              {d?.name || (detail.empty ? "Loading…" : "Game")}
            </h2>
          </div>
          <Button
            variant="secondary"
            onClick={onClose}
            className="px-2.5 py-1 text-[var(--muted)]"
          >
            Esc
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {detail.empty && (
            <p className="text-sm text-[var(--muted)]">Loading stats…</p>
          )}
          {detail.failed && (
            <p className="text-sm text-[var(--danger)]">
              Could not load game details.
            </p>
          )}
          {d && (
            <div className="space-y-8">
              <div className="overflow-hidden rounded-lg border border-[var(--line)]">
                {d.headerImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={d.headerImage}
                    alt=""
                    className="aspect-[460/215] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[460/215] items-center justify-center bg-[var(--bg-2)] text-xs text-[var(--faint)]">
                    No art
                  </div>
                )}
              </div>

              <GameDetailStats
                detail={d}
                className="space-y-8"
                beforeFriends={
                  <>
                    {variant === "family" && familyDetail && (
                      <section>
                        <SectionTitle>Family owners</SectionTitle>
                        <div className="divide-y divide-[var(--line)]">
                          {familyDetail.familyOwners.map((o) => (
                            <OwnerRow
                              key={o.steamId}
                              personaName={o.personaName}
                              avatarUrl={o.avatarUrl}
                              playtimeHours={o.playtimeHours}
                              isMe={o.isMe}
                            />
                          ))}
                        </div>
                        <p className="mt-2 font-mono text-[11px] text-[var(--muted)]">
                          {familyDetail.playtime.familyTotalHours}h family ·{" "}
                          {familyDetail.playtime.ownersWithPlaytime} with
                          playtime
                        </p>
                      </section>
                    )}

                    {variant === "friends" && friendsDetail && (
                      <section>
                        <SectionTitle>Your library</SectionTitle>
                        {friendsDetail.youOwn ? (
                          <OwnerRow
                            personaName="You"
                            avatarUrl={null}
                            playtimeHours={friendsDetail.yourPlaytimeHours ?? 0}
                            isMe
                          />
                        ) : (
                          <p className="text-sm text-[var(--muted)]">
                            You don&apos;t own this yet.
                          </p>
                        )}
                      </section>
                    )}

                    {missingFromParty.length > 0 && (
                      <section>
                        <SectionTitle>Missing from group</SectionTitle>
                        <p className="mb-2 text-xs text-[var(--faint)]">
                          Selected friends (and you) who haven&apos;t purchased
                          this
                        </p>
                        <div className="divide-y divide-[var(--line)]">
                          {missingFromParty.map((m) => (
                            <div
                              key={m.steamId}
                              className="flex items-center gap-3 py-1.5 text-sm"
                            >
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
                              <span className="min-w-0 flex-1 truncate">
                                {m.personaName}
                                {m.isMe ? (
                                  <span className="ml-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--accent)]">
                                    (me)
                                  </span>
                                ) : null}
                              </span>
                              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--warm)]">
                                Missing
                              </span>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </>
                }
              />
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
