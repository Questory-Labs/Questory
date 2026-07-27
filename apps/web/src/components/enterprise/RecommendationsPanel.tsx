"use client";

import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchRecommendations,
  fetchSettings,
  getCurationJob,
  peekCurateCache,
  sendFeedback,
  startCurationJob,
} from "@/lib/enterprise-api";
import type {
  CurationJob,
  FeedbackAction,
  RecommendationDomain,
  RecommendationItem,
  RecommendationResponse,
} from "@/lib/enterprise-types";
import { HatchShadow } from "@/components/HatchShadow";
import { AgentProgress } from "./AgentProgress";
import { DossierCard } from "./DossierCard";
import { LocationSettings } from "./LocationSettings";
import { MoodBar, type CurateOptions } from "./MoodBar";
import { PlanHero } from "./PlanHero";
import styles from "./recommendations.module.css";

const TABS: { id: RecommendationDomain | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "games", label: "Games" },
  { id: "music", label: "Music" },
  { id: "watch", label: "Watch" },
  { id: "read", label: "Read" },
];

const KIND_LABELS: Record<RecommendationItem["kind"], string> = {
  game: "Game",
  artist: "Artist",
  track: "Track",
  movie: "Movie",
  show: "Show",
  manga: "Manga",
};

function itemReactKey(item: RecommendationItem): string {
  return (
    item.itemKey ??
    `${item.kind}:${item.gameId ?? item.titleId ?? item.artistId ?? item.trackId ?? item.name}`
  );
}

function RecommendationCard({
  item,
  vote,
  dismissed,
  onFeedback,
}: {
  item: RecommendationItem;
  vote?: FeedbackAction;
  dismissed: boolean;
  onFeedback: (item: RecommendationItem, action: FeedbackAction) => void;
}) {
  const portrait =
    item.kind === "movie" || item.kind === "show" || item.kind === "manga";
  const canVote = Boolean(item.itemKey);
  return (
    <article className={styles.cardWrap} data-dismissed={dismissed}>
      <HatchShadow size="sm" faceClassName={`panel ${styles.card}`}>
        <div className={styles.cardImageWrap} data-portrait={portrait}>
          {item.imageUrl ? (
            // Arbitrary external hosts (Steam CDN, TMDB, CAA) — plain img on purpose.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.cardImage}
              src={item.imageUrl}
              alt=""
              loading="lazy"
            />
          ) : (
            <div className={styles.cardImageFallback} aria-hidden>
              {item.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <span className={styles.kindBadge}>{KIND_LABELS[item.kind]}</span>
        </div>
        <div className={styles.cardBody}>
          <h3 className={styles.cardName}>{item.name}</h3>
          <div className={styles.scoreRow}>
            <div className={styles.scoreTrack}>
              <div
                className={styles.scoreFill}
                style={{ width: `${Math.round(item.score * 100)}%` }}
              />
            </div>
            <span className={styles.scoreValue}>
              {Math.round(item.score * 100)}
            </span>
          </div>
          {item.blurb ? (
            <p className={styles.blurb}>{item.blurb}</p>
          ) : (
            item.reasons.length > 0 && (
              <ul className={styles.reasons}>
                {item.reasons.map((reason) => (
                  <li key={reason} className={styles.reason}>
                    {reason}
                  </li>
                ))}
              </ul>
            )
          )}
          {canVote && (
            <div className={styles.feedbackRow}>
              <button
                type="button"
                className={styles.feedbackBtn}
                data-active={vote === "like"}
                aria-label={`Like ${item.name}`}
                title="More like this"
                onClick={() => onFeedback(item, "like")}
              >
                👍
              </button>
              <button
                type="button"
                className={styles.feedbackBtn}
                data-active={vote === "dislike"}
                aria-label={`Dislike ${item.name}`}
                title="Less like this"
                onClick={() => onFeedback(item, "dislike")}
              >
                👎
              </button>
              <button
                type="button"
                className={styles.feedbackBtn}
                aria-label={`Dismiss ${item.name}`}
                title="Not now"
                onClick={() => onFeedback(item, "dismiss")}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </HatchShadow>
    </article>
  );
}

export function RecommendationsPanel() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<RecommendationDomain | "all">("all");
  const [jobId, setJobId] = useState<string | null>(null);
  const [peekHeuristics, setPeekHeuristics] = useState(false);
  const [curated, setCurated] = useState<RecommendationResponse | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [lastMood, setLastMood] = useState<string | undefined>();
  const [votes, setVotes] = useState<Record<string, FeedbackAction>>({});
  /** Fading: dismiss clicked, card animating out. Dismissed: removed. */
  const [fading, setFading] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);

  /* Heuristic fast path — instant, always available. */
  const recs = useQuery({
    queryKey: ["enterprise-recommendations", tab],
    queryFn: () =>
      fetchRecommendations({
        limit: 12,
        domains: tab === "all" ? undefined : [tab],
      }),
    staleTime: 60_000,
    retry: 1,
  });

  const settings = useQuery({
    queryKey: ["enterprise-settings"],
    queryFn: fetchSettings,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  /* Agentic path — poll the curation job until it settles. */
  const job = useQuery({
    queryKey: ["enterprise-curation-job", jobId],
    queryFn: () => getCurationJob(jobId as string),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "done" || status === "failed" ? false : 1500;
    },
    retry: 1,
  });

  const jobData: CurationJob | undefined = job.data;
  const jobRunning =
    Boolean(jobId) &&
    jobData?.status !== "done" &&
    jobData?.status !== "failed";

  // Latch the finished result so re-renders don't flicker back to heuristics.
  if (jobData?.status === "done" && jobData.result && curated !== jobData.result) {
    setCurated(jobData.result);
    setFromCache(Boolean(jobData.fromCache));
    setJobId(null);
    setPeekHeuristics(false);
  }
  if (jobData?.status === "failed" && jobId) {
    setJobId(null);
  }

  const curate = useCallback((mood: string | undefined, options: CurateOptions) => {
    setLastMood(mood);
    setCurated(null);
    setFromCache(false);
    setPeekHeuristics(false);
    startCurationJob({ limit: 12, mood, force: options.force })
      .then((created) => setJobId(created.jobId))
      .catch(() => setJobId(null));
  }, []);

  const useCached = useCallback((mood: string | undefined) => {
    setLastMood(mood);
    setPeekHeuristics(false);
    void peekCurateCache({ limit: 12, mood })
      .then((view) => {
        if (view.cached && view.result) {
          setCurated(view.result);
          setFromCache(true);
          return;
        }
        // Cache evaporated — fall through to a normal job.
        setCurated(null);
        setFromCache(false);
        return startCurationJob({ limit: 12, mood, force: false }).then(
          (created) => setJobId(created.jobId),
        );
      })
      .catch(() => setJobId(null));
  }, []);

  const recurate = useCallback(() => {
    curate(lastMood, { force: true });
  }, [curate, lastMood]);

  const onFeedback = useCallback(
    (item: RecommendationItem, action: FeedbackAction) => {
      const key = item.itemKey;
      if (!key) return;
      // Optimistic: reflect the vote/dismissal immediately, then fire.
      if (action === "dismiss") {
        setFading((prev) => new Set(prev).add(key));
        window.setTimeout(() => {
          setDismissed((prev) => new Set(prev).add(key));
          void queryClient.invalidateQueries({
            queryKey: ["enterprise-recommendations"],
          });
        }, 320);
      } else {
        setVotes((prev) => ({
          ...prev,
          [key]: prev[key] === action ? undefined : action,
        }) as Record<string, FeedbackAction>);
      }
      void sendFeedback(key, action).catch(() => {
        /* best-effort — the engine also learns from impressions */
      });
    },
    [queryClient],
  );

  /* Which response is on screen? */
  const showingCurated = Boolean(curated) && !jobRunning;
  const active: RecommendationResponse | undefined = showingCurated
    ? (curated as RecommendationResponse)
    : recs.data;

  const visibleItems = (active?.items ?? []).filter(
    (item) =>
      !dismissed.has(item.itemKey ?? "") &&
      (tab === "all" || !showingCurated || item.domain === tab),
  );

  const worldSummary = active?.worldSummary;
  const hasLocation = Boolean(settings.data?.city || settings.data?.latitude);

  return (
    <section>
      {/* World-context strip: what the engine knows right now. */}
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
        <>
          {recs.isLoading && !active && (
            <p className={styles.message}>Scoring your libraries…</p>
          )}
          {recs.isError && !active && (
            <p className={styles.messageError}>
              Could not load recommendations. Is QEngine running?
            </p>
          )}
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
      )}
    </section>
  );
}
