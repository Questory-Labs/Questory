"use client";

import Link from "next/link";
import type { GameDetail } from "@questorylabs/shared";
import type { ReactNode } from "react";
import { formatMoney } from "@/lib/money";

function formatPlayers(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat(undefined, {
    notation: n >= 10000 ? "compact" : "standard",
    maximumFractionDigits: n >= 10000 ? 1 : 0,
  }).format(n);
}

function formatReleaseDate(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function deckLabel(status: string | null | undefined) {
  if (!status) return null;
  if (status === "verified") return "Deck Verified";
  if (status === "playable") return "Deck Playable";
  if (status === "unsupported") return "Deck Unsupported";
  return status;
}

export function Sparkline({
  history,
  valueKey,
  label,
  size = "sm",
}: {
  history: { date: string; [k: string]: string | number }[];
  valueKey: string;
  label: string;
  /** sm = sidebar sparkline; lg = full-page chart */
  size?: "sm" | "lg";
}) {
  if (history.length < 2) {
    return <p className="text-xs text-[var(--muted)]">No history yet.</p>;
  }

  const values = history.map((h) => Number(h[valueKey]));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const large = size === "lg";
  const w = large ? 720 : 280;
  const h = large ? 180 : 72;
  const pad = large ? 8 : 4;
  const stroke = large ? 2.5 : 2;
  // Place points by real time so long dead tails don't fake a full-width line.
  const times = history.map((p) => Date.parse(String(p.date)));
  const t0 = times[0];
  const tSpan = Math.max(times[times.length - 1] - t0, 1);
  const points = history
    .map((p, i) => {
      const x = pad + ((times[i] - t0) / tSpan) * (w - pad * 2);
      const y = pad + (1 - (Number(p[valueKey]) - min) / span) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const area = `${pad},${h - pad} ${points} ${w - pad},${h - pad}`;

  return (
    <div
      className={
        large
          ? "rounded-lg border border-[var(--line)] bg-[var(--bg-0)] px-3 py-3"
          : undefined
      }
    >
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className={`w-full overflow-visible ${large ? "h-48 sm:h-56" : "h-20"}`}
        role="img"
        aria-label={label}
        preserveAspectRatio="none"
      >
        <polygon
          fill="color-mix(in oklab, var(--accent) 18%, transparent)"
          points={area}
        />
        <polyline
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          points={points}
        />
      </svg>
      <div
        className={`mt-1 flex justify-between font-mono text-[var(--faint)] ${
          large ? "text-[11px]" : "text-[10px]"
        }`}
      >
        <span>{new Date(history[0].date).toLocaleDateString()}</span>
        <span>
          {new Date(history[history.length - 1].date).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="border border-[var(--line)] px-2 py-1 text-xs text-[var(--muted)]">
      {children}
    </span>
  );
}

export function OwnerRow({
  personaName,
  avatarUrl,
  playtimeHours,
  isMe,
  href,
}: {
  personaName: string;
  avatarUrl: string | null;
  playtimeHours: number;
  isMe?: boolean;
  href?: string;
}) {
  const label = (
    <>
      {personaName}
      {isMe ? (
        <span className="ml-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--accent)]">
          (me)
        </span>
      ) : null}
    </>
  );

  return (
    <div className="flex items-center gap-3 py-1.5 text-sm">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full" />
      ) : (
        <span className="h-7 w-7 rounded-full bg-[var(--bg-2)]" />
      )}
      {href ? (
        <Link
          href={href}
          className="min-w-0 flex-1 truncate hover:text-[var(--accent)]"
        >
          {label}
        </Link>
      ) : (
        <span className="min-w-0 flex-1 truncate">{label}</span>
      )}
      <span className="font-mono text-xs text-[var(--muted)]">
        {playtimeHours}h
      </span>
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3
      className="mb-2 text-sm"
      style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
    >
      {children}
    </h3>
  );
}

/**
 * Shared rich game stats used by the family/multiplayer sidebar and the
 * library full-page game view.
 */
export function GameDetailStats({
  detail,
  showActions = true,
  showFriends = true,
  linkFriends = false,
  friendLimit = 12,
  chartSize = "sm",
  beforeFriends,
  className,
}: {
  detail: GameDetail;
  showActions?: boolean;
  showFriends?: boolean;
  /** Link friend rows to /friends/:steamId */
  linkFriends?: boolean;
  friendLimit?: number;
  /** sm keeps sidebar sparklines; lg for the library full page */
  chartSize?: "sm" | "lg";
  /** Injected between studio and friends (family owners, ownership, etc.) */
  beforeFriends?: ReactNode;
  className?: string;
}) {
  const d = detail;
  const online = d.onlinePlayers;
  const releaseLabel = formatReleaseDate(d.releaseDate);
  const deck = deckLabel(d.deckStatus);
  const tagChips = [
    ...new Set([...(d.genres || []), ...(d.tags || [])]),
  ].slice(0, 18);
  const featureChips = (d.categories || []).slice(0, 14);

  return (
    <div className={className ?? "space-y-8"}>
      {showActions && (
        <div className="flex flex-wrap gap-2">
          <a
            href={`steam://run/${d.appId}`}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-[var(--accent)] bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--bg-0)] hover:opacity-90"
          >
            Play
          </a>
          <a
            href={`https://store.steampowered.com/app/${d.appId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-[var(--line)] px-3 py-2 text-sm text-[var(--ink)] hover:border-[var(--accent)]"
          >
            Open on Steam →
          </a>
        </div>
      )}

      {(deck || releaseLabel || d.isFree) && (
        <div className="flex flex-wrap gap-2">
          {d.isFree ? <Chip>Free to Play</Chip> : null}
          {deck ? <Chip>{deck}</Chip> : null}
          {releaseLabel ? <Chip>{releaseLabel}</Chip> : null}
        </div>
      )}

      <section>
        <SectionTitle>Players online</SectionTitle>
        {online &&
        (online.current != null ||
          online.peakAllTime != null ||
          online.history.length > 0) ? (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-[var(--line)] px-2 py-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                  Now
                </div>
                <div className="mt-1 text-sm font-semibold text-[var(--accent)]">
                  {formatPlayers(online.current)}
                </div>
              </div>
              <div className="rounded-lg border border-[var(--line)] px-2 py-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                  24h peak
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {formatPlayers(online.peak24h)}
                </div>
              </div>
              <div className="rounded-lg border border-[var(--line)] px-2 py-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                  All-time
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {formatPlayers(online.peakAllTime)}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <Sparkline
                history={online.history}
                valueKey="players"
                label="Concurrent players history"
                size={chartSize}
              />
            </div>
            <a
              href={`https://steamcharts.com/app/${d.appId}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block font-mono text-[11px] text-[var(--accent)] hover:underline"
            >
              SteamCharts →
            </a>
          </>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            No concurrent player data yet.
          </p>
        )}
      </section>

      {d.minPlayers != null && d.maxPlayers != null && (
        <section>
          <SectionTitle>Multiplayer</SectionTitle>
          <p className="text-sm text-[var(--muted)]">
            {d.minPlayers === d.maxPlayers
              ? `${d.maxPlayers} players`
              : `${d.minPlayers}–${d.maxPlayers} players`}
            <span className="mt-1 block font-mono text-[10px] text-[var(--faint)]">
              {d.playerCountSource === "igdb"
                ? "Source: IGDB"
                : d.playerCountSource === "steam_tag"
                  ? "Source: Steam store tag"
                  : "Trusted capacity data"}
            </span>
          </p>
          {d.playerMaxes && d.playerMaxes.length > 1 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {d.playerMaxes.map((n) => (
                <Chip key={n}>MAX {n}</Chip>
              ))}
            </div>
          ) : null}
        </section>
      )}

      {(d.developers?.length > 0 || d.publishers?.length > 0) && (
        <section>
          <SectionTitle>Studio</SectionTitle>
          {d.developers?.length ? (
            <p className="text-sm text-[var(--muted)]">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                Dev
              </span>{" "}
              {d.developers.join(" · ")}
            </p>
          ) : null}
          {d.publishers?.length ? (
            <p className="mt-1 text-sm text-[var(--muted)]">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                Pub
              </span>{" "}
              {d.publishers.join(" · ")}
            </p>
          ) : null}
        </section>
      )}

      {beforeFriends}

      {showFriends && (
        <section>
          <SectionTitle>Friends who own it</SectionTitle>
          {d.friendOwners.length ? (
            <div className="divide-y divide-[var(--line)]">
              {d.friendOwners.slice(0, friendLimit).map((o) => (
                <OwnerRow
                  key={o.steamId}
                  personaName={o.personaName}
                  avatarUrl={o.avatarUrl}
                  playtimeHours={o.playtimeHours}
                  href={
                    linkFriends ? `/friends/${o.steamId}` : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              No synced friends own this yet.
            </p>
          )}
        </section>
      )}

      <section>
        <SectionTitle>Price</SectionTitle>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-[var(--line)] px-2 py-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
              Current
            </div>
            <div className="mt-1 text-sm font-semibold">
              {formatMoney(d.price.current, d.price.currency)}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--line)] px-2 py-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
              Hist. low
            </div>
            <div className="mt-1 text-sm font-semibold text-[var(--accent)]">
              {formatMoney(d.price.historicalLow, d.price.currency)}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--line)] px-2 py-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
              Hist. high
            </div>
            <div className="mt-1 text-sm font-semibold">
              {formatMoney(d.price.historicalHigh, d.price.currency)}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Sparkline
            history={d.price.history}
            valueKey="price"
            label="Steam price history"
            size={chartSize}
          />
        </div>
      </section>

      <section>
        <SectionTitle>HowLongToBeat</SectionTitle>
        {d.hltb ? (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-[var(--line)] px-2 py-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                Main
              </div>
              <div className="mt-1 text-sm font-semibold">
                {d.hltb.mainHours != null ? `${d.hltb.mainHours}h` : "—"}
              </div>
            </div>
            <div className="rounded-lg border border-[var(--line)] px-2 py-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                Extra
              </div>
              <div className="mt-1 text-sm font-semibold">
                {d.hltb.extraHours != null ? `${d.hltb.extraHours}h` : "—"}
              </div>
            </div>
            <div className="rounded-lg border border-[var(--line)] px-2 py-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                100%
              </div>
              <div className="mt-1 text-sm font-semibold">
                {d.hltb.completionistHours != null
                  ? `${d.hltb.completionistHours}h`
                  : "—"}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">No HLTB match found.</p>
        )}
      </section>

      <section>
        <SectionTitle>Reviews</SectionTitle>
        {d.review ? (
          <div>
            <p className="text-sm">
              <span className="text-[var(--accent)]">
                {d.review.description ||
                  (d.review.score != null
                    ? `Score ${d.review.score}`
                    : "Reviews")}
              </span>
              {d.review.totalReviews > 0 && (
                <span className="text-[var(--muted)]">
                  {" "}
                  · {d.review.totalReviews.toLocaleString()} reviews
                </span>
              )}
            </p>
            {d.review.totalReviews > 0 && (
              <p className="mt-1 font-mono text-[11px] text-[var(--faint)]">
                {d.review.totalPositive.toLocaleString()} positive ·{" "}
                {d.review.totalNegative.toLocaleString()} negative
              </p>
            )}
            {d.review.histogram && d.review.histogram.length > 1 && (
              <div className="mt-4">
                <Sparkline
                  history={d.review.histogram.map((h) => ({
                    date: new Date(h.date * 1000).toISOString().slice(0, 10),
                    price: h.recommendationsUp,
                  }))}
                  valueKey="price"
                  label="Positive reviews over time"
                  size={chartSize}
                />
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            No review data available.
          </p>
        )}
      </section>

      {d.achievements &&
        (d.achievements.global.length > 0 ||
          d.achievements.pct != null) && (
        <section>
          <SectionTitle>Achievements</SectionTitle>
          {d.achievements.pct != null && (
            <p className="mb-3 text-sm text-[var(--muted)]">
              Your progress:{" "}
              <span className="text-[var(--ink)]">
                {d.achievements.unlocked}/{d.achievements.total} (
                {d.achievements.pct}%)
              </span>
            </p>
          )}
          {d.achievements.global.length > 0 && (
            <ul className="space-y-2">
              {d.achievements.global.slice(0, 8).map((a) => (
                <li
                  key={a.name}
                  className="flex items-start gap-2 text-sm"
                >
                  {a.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.icon}
                      alt=""
                      className="mt-0.5 h-6 w-6 shrink-0 rounded-sm"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{a.displayName}</div>
                    <div className="font-mono text-[10px] text-[var(--faint)]">
                      {a.percent.toFixed(1)}% of players
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {d.news && d.news.length > 0 && (
        <section>
          <SectionTitle>News</SectionTitle>
          <ul className="space-y-3">
            {d.news.slice(0, 4).map((n) => (
              <li key={n.gid || n.url}>
                <a
                  href={n.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-[var(--accent)] hover:underline"
                >
                  {n.title}
                </a>
                <p className="mt-0.5 line-clamp-2 text-xs text-[var(--muted)]">
                  {n.contents.replace(/\\[nrt]/g, " ").slice(0, 160)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {d.dlc && d.dlc.length > 0 && (
        <section>
          <SectionTitle>DLC</SectionTitle>
          <ul className="space-y-2">
            {d.dlc.slice(0, 8).map((item) => (
              <li
                key={item.appId}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <a
                  href={`https://store.steampowered.com/app/${item.appId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-[var(--ink)] hover:text-[var(--accent)]"
                >
                  {item.name}
                </a>
                <span className="shrink-0 font-mono text-[11px] text-[var(--faint)]">
                  {item.finalPrice != null && item.currency
                    ? formatMoney(item.finalPrice, item.currency)
                    : "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {d.packages && d.packages.length > 0 && (
        <section>
          <SectionTitle>Packages</SectionTitle>
          <ul className="space-y-2">
            {d.packages.slice(0, 6).map((p) => (
              <li
                key={p.packageId}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="truncate">{p.name}</span>
                <span className="shrink-0 font-mono text-[11px] text-[var(--faint)]">
                  {p.finalPrice != null && p.currency
                    ? formatMoney(p.finalPrice, p.currency)
                    : "—"}
                  {p.discountPercent > 0 ? ` (−${p.discountPercent}%)` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tagChips.length > 0 && (
        <section>
          <SectionTitle>Tags</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {tagChips.map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </div>
        </section>
      )}

      {featureChips.length > 0 && (
        <section className="pb-4">
          <SectionTitle>Features</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {featureChips.map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
