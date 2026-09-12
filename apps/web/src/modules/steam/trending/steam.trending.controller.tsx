"use client";

import { api } from "@/lib/api";
import { peekWeeklyDigest, startWeeklyDigest } from "@/lib/enterprise-api";
import { musicFetch } from "@/lib/music";
import { readFetch } from "@/lib/read";
import { watchFetch } from "@/lib/watch";
import { useEnterpriseEnabled } from "@/hooks/useEnterpriseEnabled";
import { useMusicEnabled } from "@/hooks/useMusicEnabled";
import { useReadEnabled } from "@/hooks/useReadEnabled";
import { useWatchEnabled } from "@/hooks/useWatchEnabled";
import { useResource } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import { PropsWithChildren, useState } from "react";
import type {
  ChartShelf,
  FriendsShelf,
  GlobalShelf,
} from "./steam.trending.types";
import type { MediaTrendingShelf, WeeklyDigestView } from "@questorylabs/shared";

export const TrendingController = ({ children }: PropsWithChildren) => {
  const { showMusicNav } = useMusicEnabled();
  const { enabled: showWatchNav } = useWatchEnabled();
  const { showReadNav } = useReadEnabled();
  const { enabled: showEnterpriseNav } = useEnterpriseEnabled();

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
    when: showMusicNav,
    retries: 1,
  });

  const watch = useResource({
    id: ["trending", "watch-tmdb"],
    load: () => watchFetch<MediaTrendingShelf>("/trending/tmdb"),
    when: showWatchNav,
    retries: 1,
  });

  const read = useResource({
    id: ["trending", "read-anilist"],
    load: () => readFetch<MediaTrendingShelf>("/trending/anilist"),
    when: showReadNav,
    retries: 1,
  });

  const digestPeek = useResource({
    id: ["trending", "weekly-digest-peek"],
    load: () => peekWeeklyDigest(),
    when: showEnterpriseNav,
    retries: 1,
  });

  const digestGenerate = useResource({
    id: ["trending", "weekly-digest-generate"],
    load: () => startWeeklyDigest(),
    when:
      showEnterpriseNav &&
      digestPeek.ready &&
      !digestPeek.value?.result,
    retries: 1,
  });

  const digestValue: WeeklyDigestView | undefined = digestGenerate.value?.result
    ? digestGenerate.value
    : digestPeek.value;

  const digest = {
    ...digestPeek,
    value: digestValue,
    empty: !digestValue && digestPeek.empty && digestGenerate.empty,
    failed: digestPeek.failed && (digestGenerate.failed || !digestGenerate.ready),
    busy: digestPeek.busy || digestGenerate.busy,
  };

  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);

  const props = {
    friends,
    global,
    concurrent,
    deck,
    topReleases,
    showMusic: showMusicNav,
    showWatch: showWatchNav,
    showRead: showReadNav,
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
