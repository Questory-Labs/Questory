"use client";

import { useCallback, useState, type PropsWithChildren } from "react";
import { useResource, useStore } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
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
  RecommendationItem,
  RecommendationResponse,
} from "@/lib/enterprise-types";
import type { CurateOptions, RecsTab } from "./enterprise.recommendations.types";

export const RecommendationsController = ({ children }: PropsWithChildren) => {
  const store = useStore();
  const [tab, setTab] = useState<RecsTab>("all");
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
  const recs = useResource({
    id: ["enterprise-recommendations", tab],
    load: () =>
      fetchRecommendations({
        limit: 12,
        domains: tab === "all" ? undefined : [tab],
      }),
    freshFor: 60_000,
    retries: 1,
  });

  const settings = useResource({
    id: ["enterprise-settings"],
    load: fetchSettings,
    freshFor: 5 * 60_000,
    retries: 1,
  });

  /* Agentic path — poll the curation job until it settles. */
  const job = useResource({
    id: ["enterprise-curation-job", jobId],
    load: () => getCurationJob(jobId as string),
    when: Boolean(jobId),
    refreshEvery: (value) => {
      const status = value?.status;
      return status === "done" || status === "failed" ? false : 1500;
    },
    retries: 1,
  });

  const jobData: CurationJob | undefined = job.value;

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
          void store.touch(["enterprise-recommendations"]);
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
    [store],
  );

  return cloneElements(children, {
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
  });
};
