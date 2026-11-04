"use client";

import { PageHeader, ResourceStatus } from "@questorylabs/ui";
import { AgentProgress } from "./components/AgentProgress";
import { DossierCard } from "./components/DossierCard";
import { LocationSettings } from "./components/LocationSettings";
import { MoodBar } from "./components/MoodBar";
import { PlanHero } from "./components/PlanHero";
import { PreviousSlates } from "./components/PreviousSlates";
import { DomainTabs } from "./components/DomainTabs";
import type {
  CurationJob,
  RecommendationResponse,
} from "@/lib/enterprise-types";
import { RecommendationCard } from "./components/RecommendationCard";
import { GRID_CLASS } from "./enterprise.recommendations.constants";
import type { RecommendationsViewProps } from "./enterprise.recommendations.types";
import {
  itemReactKey,
  uniqueRecommendationItems,
} from "./enterprise.recommendations.utils";

export const RecommendationsView = (props: Record<string, unknown>) => {
  const {
    tab,
    setTab,
    dayPart,
    jobId,
    peekHeuristics,
    setPeekHeuristics,
    curated,
    fromCache,
    votes,
    fading,
    dismissed,
    settingsOpen,
    setSettingsOpen,
    recs,
    settings,
    job,
    curate,
    useCached,
    recurate,
    onFeedback,
  } = props as RecommendationsViewProps;

  const jobData: CurationJob | undefined = job.value;
  const jobRunning =
    Boolean(jobId) &&
    jobData?.status !== "done" &&
    jobData?.status !== "failed";

  const showingCurated = Boolean(curated) && !jobRunning;
  const active: RecommendationResponse | undefined = showingCurated
    ? (curated as RecommendationResponse)
    : recs.value;

  const visibleItems = uniqueRecommendationItems(active?.items ?? []).filter(
    (item) =>
      !dismissed.has(item.itemKey ?? "") &&
      (tab === "all" || !showingCurated || item.domain === tab),
  );

  const worldSummary = active?.worldSummary;
  const hasLocation = Boolean(settings.value?.city || settings.value?.latitude);
  const city = settings.value?.city;
  const showPlan = Boolean(
    active?.available &&
      visibleItems.length > 0 &&
      showingCurated &&
      active.plan &&
      active.plan.steps.length > 0 &&
      tab === "all",
  );

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-4">
      <PageHeader
        className="mb-0 px-1 pt-2"
        eyebrow={city ? `${dayPart} · ${city}` : dayPart}
        title={
          <>
            Picked <span className="font-serif text-[var(--warm)]">for you</span>
          </>
        }
        description={
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              {worldSummary ??
                `Picks across everything you track${hasLocation ? "" : " · no location set"}.`}
            </span>
            <button
              type="button"
              className="text-[var(--ink)] underline decoration-white/25 underline-offset-4 hover:decoration-white/60"
              onClick={() => setSettingsOpen((v) => !v)}
            >
              {hasLocation ? "Location" : "Set your location"}
            </button>
          </span>
        }
        actions={<DomainTabs tab={tab} onChange={setTab} />}
      />
      <LocationSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <MoodBar busy={jobRunning} onCurate={curate} onUseCached={useCached} />
      {(curated?.moodSummary || (fromCache && curated)) && !jobRunning && (
        <p className="flex flex-wrap items-center gap-2 px-1 font-serif text-[17px] text-[#cfcfd3]">
          {curated?.moodSummary ? `“${curated.moodSummary}”` : null}
          {fromCache ? (
            <span className="pill font-sans text-[11px] not-italic text-[var(--muted)]">
              Cached
            </span>
          ) : null}
        </p>
      )}

      {jobRunning && jobData && (
        <AgentProgress
          job={jobData}
          onShowHeuristics={
            peekHeuristics ? undefined : () => setPeekHeuristics(true)
          }
        />
      )}
      {jobData?.status === "failed" && (
        <p className="px-1 text-sm text-[var(--danger)]">
          {jobData.error || "Curation failed — showing quick picks instead."}
        </p>
      )}

      {showPlan && active?.plan ? (
        <div className="panel q-in flex flex-wrap gap-6 p-6 [--i:2]">
          <PlanHero
            plan={active.plan}
            items={active.items}
            onRecurate={recurate}
            busy={jobRunning}
          />
          <DossierCard />
        </div>
      ) : (
        <div className="flex">
          <DossierCard />
        </div>
      )}

      {(!jobRunning || peekHeuristics) && (
        <ResourceStatus
          failed={Boolean(recs.failed && !active)}
          empty={Boolean(recs.empty && !active)}
          loading={
            <p className="px-1 text-sm text-[var(--muted)]">Scoring your libraries…</p>
          }
          error={
            <p className="px-1 text-sm text-[var(--danger)]">
              Could not load recommendations. Is QEngine running?
            </p>
          }
        >
          <>
            {active && !active.available && (
              <p className="px-1 text-sm text-[var(--danger)]">
                {active.message || "QEngine is not running."}
              </p>
            )}
            {active?.available && visibleItems.length === 0 && (
              <p className="px-1 text-sm text-[var(--muted)]">
                Nothing to recommend yet — sync your Steam library, scrobble
                some music, connect a watch source, or sync AniList manga first.
              </p>
            )}

            {active?.available && visibleItems.length > 0 && (
              <>
                <div className={GRID_CLASS}>
                  {visibleItems.map((item) => (
                    <RecommendationCard
                      key={itemReactKey(item)}
                      item={item}
                      vote={votes[item.itemKey ?? ""]}
                      dismissed={fading.has(item.itemKey ?? "")}
                      onFeedback={onFeedback}
                    />
                  ))}
                </div>
                {showingCurated &&
                  (active.library?.length ?? 0) > 0 &&
                  tab === "all" && (
                    <section className="flex flex-col gap-3 pt-2">
                      <h2 className="label-mono text-[11px] text-[var(--faint)]">
                        From your library
                      </h2>
                      <div className={GRID_CLASS}>
                        {uniqueRecommendationItems(active.library ?? [])
                          .filter((item) => !dismissed.has(item.itemKey ?? ""))
                          .map((item) => (
                            <RecommendationCard
                              key={itemReactKey(item)}
                              item={item}
                              vote={votes[item.itemKey ?? ""]}
                              dismissed={fading.has(item.itemKey ?? "")}
                              onFeedback={onFeedback}
                            />
                          ))}
                      </div>
                    </section>
                  )}
                {tab === "all" && (
                  <PreviousSlates
                    currentKeys={
                      new Set(active.items.map((item) => item.itemKey ?? ""))
                    }
                    votes={votes}
                    onFeedback={onFeedback}
                  />
                )}
                <footer className="flex flex-wrap justify-end gap-3 border-t border-white/[0.06] px-1 pt-4">
                  <p className="font-mono text-[11px] text-[var(--faint)]">
                    {active.engine}
                    {showingCurated && active.llm?.ready
                      ? ` · curated by ${active.llm.tiers?.find((t) => t.tier === "reason")?.model ?? active.llm.model}`
                      : !active.ml?.ready
                        ? " · heuristics only"
                        : ""}
                    {showingCurated &&
                    (active.arm === "heuristic" ||
                      active.arm === "rerank-fallback")
                      ? " · heuristic order (model unavailable)"
                      : ""}
                    {active.llm?.pulling?.length
                      ? ` · pulling ${active.llm.pulling.join(", ")}`
                      : ""}
                    {` · ${visibleItems.length} ${visibleItems.length === 1 ? "pick" : "picks"}`}
                  </p>
                </footer>
              </>
            )}
          </>
        </ResourceStatus>
      )}
    </div>
  );
};
