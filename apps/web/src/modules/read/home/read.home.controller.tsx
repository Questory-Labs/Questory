"use client";

import { type PropsWithChildren } from "react";
import { useResource } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type {
  ReadBreakdownResponse,
  ReadInsights,
  ReadTimeBucket,
} from "@questorylabs/shared";
import { withTz } from "@/lib/dates";
import { readFetch } from "@/lib/read";

export const ReadHomeController = ({ children }: PropsWithChildren) => {
  const insights = useResource({
    id: ["read-insights"],
    load: () =>
      readFetch<ReadInsights>(withTz(`/analytics/insights?range=all`)),
  });
  const hour = useResource({
    id: ["read-ts-hour"],
    load: () =>
      readFetch<ReadTimeBucket[]>(
        withTz(`/analytics/timeseries?granularity=hourOfDay&range=all`),
      ),
  });
  const dow = useResource({
    id: ["read-ts-dow"],
    load: () =>
      readFetch<ReadTimeBucket[]>(
        withTz(`/analytics/timeseries?granularity=dayOfWeek&range=all`),
      ),
  });
  const formats = useResource({
    id: ["read-formats"],
    load: () =>
      readFetch<ReadBreakdownResponse>(
        `/analytics/breakdown/formats?range=all&limit=10`,
      ),
  });
  const sources = useResource({
    id: ["read-sources"],
    load: () =>
      readFetch<ReadBreakdownResponse>(
        `/analytics/breakdown/sources?range=all&limit=10`,
      ),
  });

  return cloneElements(children, {
    insights,
    hour,
    dow,
    formats,
    sources,
  });
};
