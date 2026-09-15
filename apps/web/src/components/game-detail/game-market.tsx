"use client";

import type { GameDetail } from "@questorylabs/shared";
import { formatMoney } from "@/lib/money";
import {
  HistoryChart,
  SectionTitle,
  formatPlayers,
} from "./game-detail-shared";

export const GamePriceSection = ({
  detail,
  chartSize,
}: {
  detail: GameDetail;
  chartSize: "sm" | "lg";
}) => {
  const d = detail;
  return (
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
          formatYTick={(n) =>
            formatMoney(n, d.price.currency, { compact: true })
          }
        />
      </div>
    </section>
  );
};

export const GamePlayersSection = ({
  detail,
  chartSize,
}: {
  detail: GameDetail;
  chartSize: "sm" | "lg";
}) => {
  const d = detail;
  const online = d.onlinePlayers;

  return (
    <section>
      <SectionTitle>Players online</SectionTitle>
      {online &&
      (online.current != null ||
        online.peakAllTime != null ||
        online.history.length > 0) ? (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="panel-outline px-2 py-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                Now
              </div>
              <div className="mt-1 text-sm font-semibold text-[var(--accent)]">
                {formatPlayers(online.current)}
              </div>
            </div>
            <div className="panel-outline px-2 py-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                24h peak
              </div>
              <div className="mt-1 text-sm font-semibold">
                {formatPlayers(online.peak24h)}
              </div>
            </div>
            <div className="panel-outline px-2 py-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                All-time
              </div>
              <div className="mt-1 text-sm font-semibold">
                {formatPlayers(online.peakAllTime)}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <HistoryChart
              history={online.history}
              valueKey="players"
              label="Concurrent players history"
              size={chartSize}
              valueLabel="players"
              formatValue={(n) => formatPlayers(n) ?? String(n)}
              formatYTick={(n) => formatPlayers(n) ?? String(n)}
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
  );
};

export const GameReviewsSection = ({
  detail,
  chartSize,
}: {
  detail: GameDetail;
  chartSize: "sm" | "lg";
}) => {
  const d = detail;
  return (
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
                formatValue={(n) => n.toLocaleString()}
                formatYTick={(n) => formatPlayers(n) ?? String(n)}
              />
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]">No review data available.</p>
      )}
    </section>
  );
};
