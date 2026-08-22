"use client";

import { PageHeader, ResourceStatus } from "@questorylabs/ui";
import { AgentProgress } from "./components/AgentProgress";
import { DossierCard } from "./components/DossierCard";
import { LocationSettings } from "./components/LocationSettings";
import { MoodBar } from "./components/MoodBar";
import { PlanHero } from "./components/PlanHero";
import styles from "./recommendations.module.css";
import type {
  CurationJob,
  RecommendationResponse,
} from "@/lib/enterprise-types";
import { RecommendationCard } from "./components/RecommendationCard";
import { TABS } from "./enterprise.recommendations.constants";
import type { RecommendationsViewProps } from "./enterprise.recommendations.types";
import { itemReactKey } from "./enterprise.recommendations.utils";

export const RecommendationsView = (props: Record<string, unknown>) => {
  const {
    tab,
    setTab,
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

  const visibleItems = (active?.items ?? []).filter(
    (item) =>
      !dismissed.has(item.itemKey ?? "") &&
      (tab === "all" || !showingCurated || item.domain === tab),
  );

  const worldSummary = active?.worldSummary;
  const hasLocation = Boolean(settings.value?.city || settings.value?.latitude);

  return (
    <>
      <PageHeader
        title="Recommendations"
        description="What to play, watch, and listen to next — scored from your library, listening history, and watchlists."
      />
      <section>
        <div className={styles.worldStrip}>
          {worldSummary ? (
            <span>{worldSummary}</span>
          ) : (
            <span className={styles.worldFaint}>
              Recommendations tuned to your libraries
              {hasLocation ? "" : " · no location set"}
            </span>
          )}
          <button
            type="button"
            className={styles.worldAction}
            onClick={() => setSettingsOpen((v) => !v)}
          >
            {hasLocation ? "Location" : "Set your location"}
          </button>
        </div>
        <LocationSettings
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />

        <MoodBar
          busy={jobRunning}
          onCurate={curate}
          onUseCached={useCached}
        />
        {(curated?.moodSummary || (fromCache && curated)) && !jobRunning && (
          <p className={styles.moodSummary}>
            {curated?.moodSummary ? `“${curated.moodSummary}”` : null}
            {fromCache ? <span className={styles.cacheBadge}>Cached</span> : null}
          </p>
        )}

        <DossierCard />

        <div className={styles.tabs} role="tablist" aria-label="Domains">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? styles.tabActive : styles.tab}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {jobRunning && jobData && (
          <AgentProgress
            job={jobData}
            onShowHeuristics={
              peekHeuristics ? undefined : () => setPeekHeuristics(true)
            }
          />
        )}
        {jobData?.status === "failed" && (
          <p className={styles.messageError}>
            {jobData.error || "Curation failed — showing quick picks instead."}
          </p>
        )}

        {(!jobRunning || peekHeuristics) && (
          <ResourceStatus
            failed={Boolean(recs.failed && !active)}
            empty={Boolean(recs.empty && !active)}
            loading={
              <p className={styles.message}>Scoring your libraries…</p>
            }
            error={
              <p className={styles.messageError}>
                Could not load recommendations. Is QEngine running?
              </p>
            }
          >
            <>
              {active && !active.available && (
                <p className={styles.messageError}>
                  {active.message || "QEngine is not running."}
                </p>
              )}
              {active?.available && visibleItems.length === 0 && (
                <p className={styles.message}>
                  Nothing to recommend yet — sync your Steam library, scrobble
                  some music, connect a watch source, or sync AniList manga first.
                </p>
              )}

              {active?.available && visibleItems.length > 0 && (
                <>
                  {showingCurated && active.plan && tab === "all" && (
                    <PlanHero
                      plan={active.plan}
                      items={active.items}
                      onRecurate={recurate}
                      busy={jobRunning}
                    />
                  )}
                  <div className={styles.grid}>
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
                  <p className={styles.meta}>
                    {active.engine}
                    {showingCurated && active.llm?.ready
                      ? ` · curated by ${active.llm.model}`
                      : !active.ml?.ready
                        ? " · heuristics only"
                        : ""}
                    {active.llm?.pulling?.length
                      ? ` · pulling ${active.llm.pulling.join(", ")}`
                      : ""}
                  </p>
                </>
              )}
            </>
          </ResourceStatus>
        )}
      </section>
    </>
  );
};
