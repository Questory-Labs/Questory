"use client";

import { useState, type PropsWithChildren } from "react";
import { useResource } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type {
  WatchBreakdownResponse,
  WatchInsights,
  WatchTimeBucket,
} from "@questorylabs/shared";
import type { WatchMediaFilter } from "./watch.home.types";
import { withTz } from "@/lib/dates";
import { watchFetch } from "@/lib/watch";
import { typeQuery } from "./watch.home.utils";

export const WatchHomeController = ({ children }: PropsWithChildren) => {
  const [media, setMedia] = useState<WatchMediaFilter>("all");
  const typeQs = typeQuery(media);

  const insights = useResource({
    id: ["watch-insights", media],
    load: () =>
      watchFetch<WatchInsights>(
        withTz(`/analytics/insights?range=all${typeQs}`),
      ),
  });
  const hour = useResource({
    id: ["watch-ts-hour", media],
    load: () =>
      watchFetch<WatchTimeBucket[]>(
        withTz(
          `/analytics/timeseries?granularity=hourOfDay&range=all${typeQs}`,
        ),
      ),
  });
  const dow = useResource({
    id: ["watch-ts-dow", media],
    load: () =>
      watchFetch<WatchTimeBucket[]>(
        withTz(
          `/analytics/timeseries?granularity=dayOfWeek&range=all${typeQs}`,
        ),
      ),
  });
  const years = useResource({
    id: ["watch-years", media],
    load: () =>
      watchFetch<WatchBreakdownResponse>(
        `/analytics/breakdown/years?range=all&limit=16${typeQs}`,
      ),
  });
  const sources = useResource({
    id: ["watch-sources", media],
    load: () =>
      watchFetch<WatchBreakdownResponse>(
        `/analytics/breakdown/sources?range=all&limit=10${typeQs}`,
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
  });
};
