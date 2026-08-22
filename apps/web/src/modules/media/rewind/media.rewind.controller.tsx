"use client";

import { useEffect, useState, type PropsWithChildren } from "react";
import { useResource } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import { musicFetch } from "@/lib/music";
import { watchFetch } from "@/lib/watch";
import { readFetch } from "@/lib/read";
import type {
  RewindInsightResponse,
  RewindStatsResponse,
} from "@questorylabs/shared";
import {
  completedRewindMonths,
  defaultRewindMonthForYear,
  getRewindAiPeriodError,
  isRewindAiGenerationAllowed,
  latestCompletedRewindMonth,
} from "@questorylabs/shared";
import { useEnterpriseEnabled } from "@/hooks/useEnterpriseEnabled";
import { CURRENT_YEAR } from "./media.rewind.constants";
import type { RewindDomain, RewindMonth } from "./media.rewind.types";

export const RewindController = ({
  children,
  domain,
}: PropsWithChildren<{ domain: RewindDomain }>) => {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [month, setMonth] = useState<RewindMonth>(() =>
    defaultRewindMonthForYear(CURRENT_YEAR),
  );
  const [forceRedo, setForceRedo] = useState(false);
  const { when: enterpriseEnabled } = useEnterpriseEnabled();

  const fetcher =
    domain === "music"
      ? musicFetch
      : domain === "watch"
        ? watchFetch
        : readFetch;

  const period =
    month === "all" ? `${year}` : `${year}-${month.toString().padStart(2, "0")}`;
  const aiGenerationAllowed = isRewindAiGenerationAllowed(period);
  const aiPeriodError = getRewindAiPeriodError(period);

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const statsQuery = useResource({
    id: ["rewind-stats", domain, period, tz],
    load: () =>
      fetcher<RewindStatsResponse>(
        `/analytics/rewind/stats?period=${period}&tz=${tz}`,
      ),
  });

  const aiQuery = useResource({
    id: ["rewind-ai", domain, period, forceRedo],
    load: async () => {
      const result = await fetcher<RewindInsightResponse>(
        `/analytics/rewind/ai?period=${period}&tz=${encodeURIComponent(tz)}${forceRedo ? "&forceRedo=true" : ""}`,
      );
      if (forceRedo) {
        setForceRedo(false);
      }
      return result;
    },
    when: enterpriseEnabled && aiGenerationAllowed,
  });

  const availableMonths = completedRewindMonths(year);
  const hasCompletedMonths = availableMonths.length > 0;

  useEffect(() => {
    if (year < CURRENT_YEAR) return;
    const latest = latestCompletedRewindMonth(year);
    if (!latest) return;
    if (
      month === "all" ||
      (typeof month === "number" && !availableMonths.includes(month))
    ) {
      setMonth(latest);
    }
  }, [year, month, availableMonths]);

  const handleYearChange = (y: number) => {
    setYear(y);
    setMonth(defaultRewindMonthForYear(y));
  };

  const handleRedo = () => {
    setForceRedo(true);
    setTimeout(() => aiQuery.reload(), 0);
  };

  return cloneElements(children, {
    domain,
    year,
    month,
    setMonth,
    handleYearChange,
    handleRedo,
    enterpriseEnabled,
    statsQuery,
    aiQuery,
    availableMonths,
    hasCompletedMonths,
    period,
    aiGenerationAllowed,
    aiPeriodError,
    forceRedo,
  });
};
