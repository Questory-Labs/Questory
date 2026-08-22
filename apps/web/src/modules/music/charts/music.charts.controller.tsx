"use client";

import { useState, type PropsWithChildren } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useResource } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type {
  MusicBreakdownResponse,
  MusicRange,
  MusicTopsResponse,
} from "@questorylabs/shared";
import { musicFetch } from "@/lib/music";
import { MUSIC_CHARTS_PAGE_SIZE } from "@/lib/pagination";
import type { TopsKind } from "./music.charts.constants";
import { parseKind } from "./music.charts.utils";

export const MusicChartsController = ({ children }: PropsWithChildren) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [range, setRange] = useState<MusicRange>("week");
  const [page, setPage] = useState(1);
  const kind = parseKind(searchParams.get("kind"));

  const setKind = (next: TopsKind) => {
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    params.set("kind", next);
    router.replace(`/music/charts?${params.toString()}`, { scroll: false });
  };

  const onRangeChange = (next: MusicRange) => {
    setPage(1);
    setRange(next);
  };

  const tops = useResource({
    id: ["music-tops", kind, range, page],
    load: () =>
      musicFetch<MusicTopsResponse>(
        `/analytics/tops/${kind}?range=${range}&page=${page}&pageSize=${MUSIC_CHARTS_PAGE_SIZE}`,
      ),
  });

  const years = useResource({
    id: ["music-breakdown-years", range],
    load: () =>
      musicFetch<MusicBreakdownResponse>(
        `/analytics/breakdown/years?range=${range}&limit=12`,
      ),
  });

  const services = useResource({
    id: ["music-breakdown-services", range],
    load: () =>
      musicFetch<MusicBreakdownResponse>(
        `/analytics/breakdown/services?range=${range}&limit=8`,
      ),
  });

  return cloneElements(children, {
    kind,
    setKind,
    range,
    onRangeChange,
    page,
    setPage,
    tops,
    years,
    services,
  });
};
