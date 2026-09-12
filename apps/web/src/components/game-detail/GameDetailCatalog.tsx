"use client";

import type { GameDetail } from "@questorylabs/shared";
import { GaugeChart } from "@/components/charts/GaugeChart";
import {
  Chip,
  HistoryChart,
  SectionTitle,
  formatMoney,
} from "./game-detail-shared";

export const GameDetailCatalog = ({
  detail,
  chartSize,
  playtimeHours,
}: {
  detail: GameDetail;
  chartSize: "sm" | "lg";
  playtimeHours?: number;
}) => {
  const d = detail;
  const tagChips = [
    ...new Set([...(d.genres || []), ...(d.tags || [])]),
  ].slice(0, 18);
  const featureChips = (d.categories || []).slice(0, 14);
  const hltbMain = d.hltb?.mainHours;
  const hltbProgress =
    hltbMain != null && hltbMain > 0 && playtimeHours != null
      ? Math.min(playtimeHours, hltbMain)
      : null;

  return (
    <>
      <section>
        <SectionTitle>Price</SectionTitle>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="panel-outline px-2 py-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
              Current
            </div>
            <div className="mt-1 text-sm font-semibold">
              {formatMoney(d.price.current, d.price.currency)}
            </div>
          </div>
          <div className="panel-outline px-2 py-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
              Hist. low
            </div>
            <div className="mt-1 text-sm font-semibold text-[var(--accent)]">
              {formatMoney(d.price.historicalLow, d.price.currency)}
            </div>
          </div>
          <div className="panel-outline px-2 py-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
              Hist. high
            </div>
            <div className="mt-1 text-sm font-semibold">
              {formatMoney(d.price.historicalHigh, d.price.currency)}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <HistoryChart
            history={d.price.history}
            valueKey="price"
            label="Steam price history"
            size={chartSize}
            valueLabel=""
            formatValue={(n) => formatMoney(n, d.price.currency)}
          />
        </div>
      </section>

      <section>
        <SectionTitle>HowLongToBeat</SectionTitle>
        {d.hltb ? (
          <>
            {hltbProgress != null && hltbMain ? (
              <GaugeChart
                value={hltbProgress}
                max={hltbMain}
                ariaLabel="HowLongToBeat main-story progress"
                label={`${playtimeHours}h of ${hltbMain}h main`}
              />
            ) : null}
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="panel-outline px-2 py-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                  Main
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {d.hltb.mainHours != null ? `${d.hltb.mainHours}h` : "—"}
                </div>
              </div>
              <div className="panel-outline px-2 py-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                  Extra
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {d.hltb.extraHours != null ? `${d.hltb.extraHours}h` : "—"}
                </div>
              </div>
              <div className="panel-outline px-2 py-3">
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
          </>
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
                <HistoryChart
                  history={d.review.histogram.map((h) => ({
                    date: new Date(h.date * 1000).toISOString().slice(0, 10),
                    price: h.recommendationsUp,
                  }))}
                  valueKey="price"
                  label="Positive reviews over time"
                  size={chartSize}
                  valueLabel="positive"
                />
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">No review data available.</p>
        )}
      </section>

      {d.achievements &&
        (d.achievements.global.length > 0 || d.achievements.pct != null) && (
          <section>
            <SectionTitle>Achievements</SectionTitle>
            {d.achievements.pct != null && (
              <GaugeChart
                value={d.achievements.pct}
                max={100}
                ariaLabel="Achievement completion"
                label={`${d.achievements.unlocked}/${d.achievements.total} (${d.achievements.pct}%)`}
              />
            )}
            {d.achievements.global.length > 0 && (
              <ul className="mt-3 space-y-2">
                {d.achievements.global.slice(0, 8).map((a) => (
                  <li key={a.name} className="flex items-start gap-2 text-sm">
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
    </>
  );
};
