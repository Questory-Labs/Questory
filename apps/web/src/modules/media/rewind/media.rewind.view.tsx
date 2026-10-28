"use client";

import type { CSSProperties } from "react";
import { ResourceStatus } from "@questorylabs/ui";
import { StateMessage } from "@/components/ui";
import { RewindAiPanel } from "./components/RewindAiPanel";
import { RewindDomainTabs } from "./components/RewindDomainTabs";
import { RewindHeader } from "./components/RewindHeader";
import { RewindHero } from "./components/RewindHero";
import { RewindShareButton } from "./components/RewindShareButton";
import { RewindStatCard } from "./components/RewindStatCard";
import { RewindTopList } from "./components/RewindTopList";
import {
  CURRENT_YEAR,
  REWIND_SCOPE_COLOR,
  REWIND_SCOPE_SOFT_COLOR,
} from "./media.rewind.constants";
import { longPeriodLabel } from "./media.rewind.format";
import type { RewindViewProps } from "./media.rewind.types";

const heroSlot = "flex-[999_1_520px] min-w-0";

export const RewindView = (props: Record<string, unknown>) => {
  const {
    domain,
    enabledDomains,
    year,
    month,
    setMonth,
    handleYearChange,
    handleRedo,
    enterpriseEnabled,
    statsQuery,
    summary,
    aiQuery,
    availableMonths,
    hasCompletedMonths,
    period,
    aiGenerationAllowed,
    aiPeriodError,
    forceRedo,
  } = props as RewindViewProps;

  const titleLead =
    domain === "all" ? "Your" : `${domain.charAt(0).toUpperCase()}${domain.slice(1)}`;
  const periodName = longPeriodLabel(period);
  const noMonthsYet = !hasCompletedMonths && year === CURRENT_YEAR;
  const aiBlocked = noMonthsYet
    ? `No completed months yet for ${year}. Monthly AI rewind will be available after the first month ends.`
    : !aiGenerationAllowed
      ? (aiPeriodError ?? "AI rewind is not available for this period.")
      : null;

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-4">
      <RewindHeader
        eyebrow={`Your top insights for ${periodName}`}
        titleLead={titleLead}
        accentColor={REWIND_SCOPE_SOFT_COLOR[domain]}
        year={year}
        month={month}
        availableMonths={availableMonths}
        monthDisabled={noMonthsYet}
        onYearChange={handleYearChange}
        onMonthChange={setMonth}
        share={
          <RewindShareButton
            title={`My ${periodName} ${domain === "all" ? "" : `${titleLead} `}Rewind`}
            fileName={`questory-rewind-${domain}-${period}.png`}
            tiles={summary?.stats ?? []}
          />
        }
      />

      <div className="q-in" style={{ "--i": 1 } as CSSProperties}>
        <RewindDomainTabs domain={domain} enabled={enabledDomains} />
      </div>

      <div className="flex flex-wrap gap-3.5">
        <ResourceStatus
          failed={statsQuery.failed}
          empty={statsQuery.empty}
          loading={
            <div className={heroSlot}>
              <StateMessage variant="loading">Crunching the numbers...</StateMessage>
            </div>
          }
          error={
            <div className={heroSlot}>
              <StateMessage variant="error">
                {statsQuery.error?.message || "Failed to load stats"}
              </StateMessage>
            </div>
          }
        >
          {summary ? <RewindHero hero={summary.hero} color={REWIND_SCOPE_COLOR[domain]} /> : null}
        </ResourceStatus>
        {enterpriseEnabled ? (
          <RewindAiPanel
            aiQuery={aiQuery}
            domain={domain}
            blockedMessage={aiBlocked}
            onRegenerate={handleRedo}
            regenerateDisabled={!aiGenerationAllowed || aiQuery.refreshing || forceRedo}
          />
        ) : null}
      </div>

      {summary && !statsQuery.failed ? (
        <>
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
                <RewindTopList key={list.key} title={list.title} items={list.items} />
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
};
