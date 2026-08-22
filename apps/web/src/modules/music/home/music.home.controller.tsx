"use client";

import { useState, type PropsWithChildren } from "react";
import { useResource } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type {
  MusicBreakdownResponse,
  MusicHeatmap,
  MusicInsights,
  MusicRange,
  MusicTimeBucket,
} from "@questorylabs/shared";
import { useMusicPlayingNow } from "@/hooks/useMusicPlayingNow";
import { CALENDAR_HEATMAP_RANGES } from "@/lib/charts";
import { withTz } from "@/lib/dates";
import { musicFetch } from "@/lib/music";

export const MusicHomeController = ({ children }: PropsWithChildren) => {
  const [range, setRange] = useState<MusicRange>("week");
  const showCalendar = CALENDAR_HEATMAP_RANGES.has(range);
  const playing = useMusicPlayingNow();

  const insights = useResource({
    id: ["music-insights", range],
    load: () =>
      musicFetch<MusicInsights>(withTz(`/analytics/insights?range=${range}`)),
  });
  const heatmap = useResource({
    id: ["music-heatmap", range],
    load: () =>
      musicFetch<MusicHeatmap>(withTz(`/analytics/heatmap?range=${range}`)),
  });
  const daySeries = useResource({
    id: ["music-ts-day", range],
    load: () =>
      musicFetch<MusicTimeBucket[]>(
        withTz(`/analytics/timeseries?granularity=day&range=${range}`),
      ),
    when: showCalendar,
  });
  const hour = useResource({
    id: ["music-ts-hour", range],
    load: () =>
      musicFetch<MusicTimeBucket[]>(
        withTz(`/analytics/timeseries?granularity=hourOfDay&range=${range}`),
      ),
  });
  const dow = useResource({
    id: ["music-ts-dow", range],
    load: () =>
      musicFetch<MusicTimeBucket[]>(
        withTz(`/analytics/timeseries?granularity=dayOfWeek&range=${range}`),
      ),
  });
  const years = useResource({
    id: ["music-years", range],
    load: () =>
      musicFetch<MusicBreakdownResponse>(
        `/analytics/breakdown/years?range=${range}&limit=16`,
      ),
  });
  const services = useResource({
    id: ["music-services", range],
    load: () =>
      musicFetch<MusicBreakdownResponse>(
        `/analytics/breakdown/services?range=${range}&limit=10`,
      ),
  });

  return cloneElements(children, {
    range,
    setRange,
    insights,
    playing,
    heatmap,
    daySeries,
    hour,
    dow,
    years,
    services,
    showCalendar,
  });
};
