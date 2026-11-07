"use client";

import { useMemo, type CSSProperties } from "react";
import type { PublicRewindShare } from "@questorylabs/shared";
import { RewindHero } from "../components/RewindHero";
import { RewindStatCard } from "../components/RewindStatCard";
import { RewindTopList } from "../components/RewindTopList";
import { REWIND_SCOPE_COLOR, REWIND_SCOPE_SOFT_COLOR } from "../media.rewind.constants";
import { longPeriodLabel } from "../media.rewind.format";
import { buildRewindSummary } from "../media.rewind.summary";
import type { RewindScope } from "../media.rewind.types";
import { formatAiCards } from "../media.rewind.utils";

export const publicRewindTitle = (share: Pick<PublicRewindShare, "domain" | "period" | "owner">) => {
  const scope = share.domain === "all" ? "" : `${share.domain.charAt(0).toUpperCase()}${share.domain.slice(1)} `;
  return `${share.owner.personaName}'s ${longPeriodLabel(share.period)} ${scope}Rewind`;
};

export const PublicRewindView = ({ share }: { share: PublicRewindShare }) => {
  const domain = share.domain as RewindScope;
  const summary = useMemo(() => buildRewindSummary(share.stats), [share.stats]);
  const aiCards = useMemo(
    () => (share.ai ? formatAiCards(share.ai.content, domain) : []),
    [share.ai, domain],
  );
  const periodName = longPeriodLabel(share.period);
  const titleLead =
    domain === "all" ? "" : `${domain.charAt(0).toUpperCase()}${domain.slice(1)} `;

  return (
    <main className="mx-auto flex max-w-[1180px] flex-col gap-4 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4 pb-1 pt-2">
        <div className="flex items-center gap-4">
          {share.owner.avatarUrl ? (
            <img
              src={share.owner.avatarUrl}
              alt=""
              width={56}
              height={56}
              className="size-14 rounded-full border border-white/12 object-cover"
            />
          ) : null}
          <div>
            <p className="label-mono m-0">{`Top insights for ${periodName}`}</p>
            <h1 className="font-display mt-1 text-3xl leading-tight sm:text-4xl">
              {share.owner.personaName}&rsquo;s {titleLead}
              <em className="font-serif" style={{ color: REWIND_SCOPE_SOFT_COLOR[domain] }}>
                Rewind
              </em>
            </h1>
          </div>
        </div>
        <a
          href="/"
          className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-4 text-[13px] text-ink transition-colors duration-300 hover:border-white/22 hover:bg-white/8"
        >
          Make your own on Questory
        </a>
      </header>

      <div className="flex flex-wrap gap-3.5">
        <RewindHero hero={summary.hero} color={REWIND_SCOPE_COLOR[domain]} />
      </div>

      {aiCards.length ? (
        <section
          aria-label="AI rewind"
          className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3.5"
        >
          {aiCards.map((card, i) => (
            <article
              key={`${card.title}-${i}`}
              className="panel q-in min-w-0 px-[18px] py-4"
              style={{ "--i": 3 + i } as CSSProperties}
            >
              <h3 className="label-mono m-0">{card.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink">{card.text}</p>
            </article>
          ))}
        </section>
      ) : null}

      {summary.stats.length ? (
        <section
          aria-label="Stats"
          className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3.5"
        >
          {summary.stats.map((tile, i) => (
            <RewindStatCard
              key={tile.key}
              index={i}
              title={tile.label}
              value={tile.value}
              subtitle={tile.note}
            />
          ))}
        </section>
      ) : null}

      {summary.lists.length ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3.5">
          {summary.lists.map((list) => (
            <RewindTopList
              key={list.key}
              title={list.title}
              category={list.category}
              items={list.items}
            />
          ))}
        </div>
      ) : null}

      <p className="mt-4 text-center text-xs text-muted">
        Shared from Questory · snapshot taken {new Date(share.createdAt).toLocaleDateString()}
      </p>
    </main>
  );
};
