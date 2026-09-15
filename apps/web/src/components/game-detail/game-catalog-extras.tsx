"use client";

import type { GameDetail } from "@questorylabs/shared";
import { formatMoney } from "@/lib/money";
import {
  GAME_DETAIL_DLC_LIMIT,
  GAME_DETAIL_FEATURE_LIMIT,
  GAME_DETAIL_NEWS_LIMIT,
  GAME_DETAIL_PACKAGE_LIMIT,
  GAME_DETAIL_TAG_LIMIT,
} from "./game-detail.constants";
import { Chip, SectionTitle } from "./game-detail-shared";

export const GameCatalogExtras = ({ detail }: { detail: GameDetail }) => {
  const d = detail;
  const tagChips = [
    ...new Set([...(d.genres || []), ...(d.tags || [])]),
  ].slice(0, GAME_DETAIL_TAG_LIMIT);
  const featureChips = [...new Set(d.categories || [])].slice(
    0,
    GAME_DETAIL_FEATURE_LIMIT,
  );

  return (
    <>
      {d.news && d.news.length > 0 && (
        <section>
          <SectionTitle>News</SectionTitle>
          <ul className="space-y-3">
            {d.news.slice(0, GAME_DETAIL_NEWS_LIMIT).map((n) => (
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
            {d.dlc.slice(0, GAME_DETAIL_DLC_LIMIT).map((item) => (
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
            {d.packages.slice(0, GAME_DETAIL_PACKAGE_LIMIT).map((p) => (
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
              <Chip key={`tag-${t}`}>{t}</Chip>
            ))}
          </div>
        </section>
      )}

      {featureChips.length > 0 && (
        <section className="pb-4">
          <SectionTitle>Features</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {featureChips.map((t) => (
              <Chip key={`feature-${t}`}>{t}</Chip>
            ))}
          </div>
        </section>
      )}
    </>
  );
};
