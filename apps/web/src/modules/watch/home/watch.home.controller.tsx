"use client";

import { useState, type PropsWithChildren } from "react";
import { useResource } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type {
  WatchBreakdownResponse,
  WatchContinueResponse,
  WatchInsights,
  WatchTimeBucket,
  WatchTopItem,
} from "@questorylabs/shared";
import type { WatchMediaFilter } from "./watch.home.types";
import { withTz } from "@/lib/dates";
import { watchFetch } from "@/lib/watch";
import {
  typeQuery,
  WATCH_HOME_CONTINUE_LIMIT,
  WATCH_HOME_RANGE,
  WATCH_HOME_TOPS_LIMIT,
} from "./watch.home.utils";

export const WatchHomeController = ({ children }: PropsWithChildren) => {
  const [media, setMedia] = useState<WatchMediaFilter>("all");
  const typeQs = typeQuery(media);
  const range = `range=${WATCH_HOME_RANGE}`;

  const insights = useResource({
    id: ["watch-insights", media],
    load: () =>
      watchFetch<WatchInsights>(withTz(`/analytics/insights?${range}${typeQs}`)),
  });
  const hour = useResource({
    id: ["watch-ts-hour", media],
    load: () =>
      watchFetch<WatchTimeBucket[]>(
        withTz(`/analytics/timeseries?granularity=hourOfDay&${range}${typeQs}`),
      ),
  });
  const dow = useResource({
    id: ["watch-ts-dow", media],
    load: () =>
      watchFetch<WatchTimeBucket[]>(
        withTz(`/analytics/timeseries?granularity=dayOfWeek&${range}${typeQs}`),
      ),
  });
  const years = useResource({
    id: ["watch-years", media],
    load: () =>
      watchFetch<WatchBreakdownResponse>(
        `/analytics/breakdown/years?${range}&limit=16${typeQs}`,
      ),
  });
  const sources = useResource({
    id: ["watch-sources", media],
    load: () =>
      watchFetch<WatchBreakdownResponse>(
        `/analytics/breakdown/sources?${range}&limit=10${typeQs}`,
      ),
  });
  const tops = useResource({
    id: ["watch-tops", media],
    load: () =>
      watchFetch<WatchTopItem[]>(
        `/analytics/tops/titles?${range}&limit=${WATCH_HOME_TOPS_LIMIT}&sort=minutes${typeQs}`,
      ),
  });
  const continuing = useResource({
    id: ["watch-continue"],
    load: () =>
      watchFetch<WatchContinueResponse>(
        `/analytics/continue?limit=${WATCH_HOME_CONTINUE_LIMIT}`,
      ),
  });

  return cloneElements(children, {
    media,
    setMedia,
    insights,
    hour,
    dow,
    years,
    sources,
    tops,
    continuing,
  });
};
