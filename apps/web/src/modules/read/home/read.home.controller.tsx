"use client";

import { useState, type PropsWithChildren } from "react";
import { useResource } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type {
  ReadBreakdownResponse,
  ReadInsights,
  ReadLibraryPage,
  ReadRange,
  ReadTimeBucket,
  SourcesOverview,
} from "@questorylabs/shared";
import { api } from "@/lib/api";
import { withTz } from "@/lib/dates";
import { readFetch } from "@/lib/read";
import { READ_HOME_DEFAULT_RANGE, READ_HOME_READING_LIMIT } from "./read.home.utils";

export const ReadHomeController = ({ children }: PropsWithChildren) => {
  const [range, setRange] = useState<ReadRange>(READ_HOME_DEFAULT_RANGE);
  const insights = useResource({
    id: ["read-insights", range],
    load: () => readFetch<ReadInsights>(withTz(`/analytics/insights?range=${range}`)),
  });
  const hour = useResource({
    id: ["read-ts-hour", range],
    load: () =>
      readFetch<ReadTimeBucket[]>(withTz(`/analytics/timeseries?granularity=hourOfDay&range=${range}`)),
  });
  const dow = useResource({
    id: ["read-ts-dow", range],
    load: () =>
      readFetch<ReadTimeBucket[]>(withTz(`/analytics/timeseries?granularity=dayOfWeek&range=${range}`)),
  });
  const formats = useResource({
    id: ["read-formats", range],
    load: () => readFetch<ReadBreakdownResponse>(`/analytics/breakdown/formats?range=${range}&limit=10`),
  });
  const sources = useResource({
    id: ["read-sources", range],
    load: () => readFetch<ReadBreakdownResponse>(`/analytics/breakdown/sources?range=${range}&limit=10`),
  });
  const reading = useResource({
    id: ["read-currently-reading"],
    load: () =>
      readFetch<ReadLibraryPage>(`/library?status=reading&page=1&pageSize=${READ_HOME_READING_LIMIT}`),
  });
  const overview = useResource({
    id: ["sources-overview"],
    load: () => api<SourcesOverview>("/sources"),
  });

  return cloneElements(children, {
    range,
    setRange,
    insights,
    hour,
    dow,
    formats,
    sources,
    reading,
    overview,
  });
};
