"use client";

import { api } from "@/lib/api";
import { peekWeeklyDigest, startWeeklyDigest } from "@/lib/enterprise-api";
import { musicFetch } from "@/lib/music";
import { readFetch } from "@/lib/read";
import { watchFetch } from "@/lib/watch";
import { useEnterpriseEnabled } from "@/hooks/useEnterpriseEnabled";
import { useFeatureSources } from "@/hooks/useFeatureSources";
import { useMusicEnabled } from "@/hooks/useMusicEnabled";
import { useReadEnabled } from "@/hooks/useReadEnabled";
import { useWatchEnabled } from "@/hooks/useWatchEnabled";
import { sourceEnabled } from "@/lib/app-status";
import { JOB_POLL_MS } from "@/lib/polling";
import { useResource, useStore } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import { PropsWithChildren, useState } from "react";
import type {
  ChartShelf,
  FriendsShelf,
  GlobalShelf,
} from "./steam.trending.types";
import type { MediaTrendingShelf, WeeklyDigestView } from "@questorylabs/shared";

const digestPeekId = ["trending", "insight-peek"];

export const TrendingController = ({ children }: PropsWithChildren) => {
  const store = useStore();
  const { showMusicNav } = useMusicEnabled();
  const { enabled: showWatchNav } = useWatchEnabled();
  const { showReadNav } = useReadEnabled();
  const sources = useFeatureSources();
  const showMusicShelf =
    showMusicNav && sourceEnabled(sources, "listenbrainzApi");
  const showWatchShelf = showWatchNav && sourceEnabled(sources, "tmdb");
  const showReadShelf = showReadNav && sourceEnabled(sources, "anilist");
  const { enabled: showEnterpriseNav } = useEnterpriseEnabled();
  const [insightStarted, setInsightStarted] = useState(false);

  const friends = useResource({
    id: ["trending", "friends"],
    load: () => api<FriendsShelf>("/trending/friends"),
  });

  const global = useResource({
    id: ["trending", "global"],
    load: () => api<GlobalShelf>("/trending/global"),
  });

  const concurrent = useResource({
    id: ["trending", "concurrent"],
    load: () => api<ChartShelf>("/trending/concurrent"),
  });

  const deck = useResource({
    id: ["trending", "deck"],
    load: () => api<ChartShelf>("/trending/deck"),
  });

  const topReleases = useResource({
    id: ["trending", "top-releases"],
    load: () => api<ChartShelf>("/trending/top-releases"),
  });

  const music = useResource({
    id: ["trending", "music-sitewide"],
    load: () => musicFetch<MediaTrendingShelf>("/trending/sitewide"),
    when: showMusicShelf,
    retries: 1,
  });

  const watch = useResource({
    id: ["trending", "watch-tmdb"],
    load: () => watchFetch<MediaTrendingShelf>("/trending/tmdb"),
    when: showWatchShelf,
    retries: 1,
  });

  const read = useResource({
    id: ["trending", "read-anilist"],
    load: () => readFetch<MediaTrendingShelf>("/trending/anilist"),
    when: showReadShelf,
    retries: 1,
  });

  const digestPeek = useResource({
    id: digestPeekId,
    load: () => peekWeeklyDigest(),
    when: showEnterpriseNav,
    retries: 1,
    refreshEvery: (value) => (value?.generating ? JOB_POLL_MS : false),
  });

  const digestGenerate = useResource({
    id: ["trending", "insight-generate"],
    load: async () => {
      const started = await startWeeklyDigest();
      setInsightStarted(true);
      store.touch(digestPeekId);
      return started;
    },
    when:
      showEnterpriseNav &&
      digestPeek.ready &&
      !digestPeek.value?.result?.llmPolished &&
      !digestPeek.value?.generating &&
      !insightStarted,
    retries: 1,
  });

  const digestValue: WeeklyDigestView | undefined = digestPeek.value?.result
    ? digestPeek.value
    : digestGenerate.value?.result
      ? digestGenerate.value
      : digestPeek.value ?? digestGenerate.value;

  const digest = {
    ...digestPeek,
    value: digestValue,
    empty: !digestValue && digestPeek.empty && digestGenerate.empty,
    failed: digestPeek.failed && (digestGenerate.failed || !digestGenerate.ready),
    busy:
      digestPeek.busy ||
      digestGenerate.busy ||
      digestValue?.generating === true,
  };

  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);

  const props = {
    friends,
    global,
    concurrent,
    deck,
    topReleases,
    showMusic: showMusicShelf,
    showWatch: showWatchShelf,
    showRead: showReadShelf,
    showEnterprise: showEnterpriseNav,
    music,
    watch,
    read,
    digest,
    selectedAppId,
    setSelectedAppId,
  };

  return cloneElements(children, props);
};
