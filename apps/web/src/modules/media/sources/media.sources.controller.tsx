"use client";

import { useMemo, type PropsWithChildren } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useResource } from "@questorylabs/qhttp/react";
import type { SourcesOverview } from "@questorylabs/shared";
import { cloneElements } from "@questorylabs/ui";
import { api } from "@/lib/api";
import { useMusicEnabled } from "@/hooks/useMusicEnabled";
import { useReadEnabled } from "@/hooks/useReadEnabled";
import { useWatchEnabled } from "@/hooks/useWatchEnabled";
import type { MediaSourcesViewProps, SourcesTab } from "./media.sources.types";
import { pickSourcesTab, sourcesFlash, sourcesTabs } from "./media.sources.utils";

export const MediaSourcesController = ({ children }: PropsWithChildren) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const music = useMusicEnabled();
  const { enabled: watch } = useWatchEnabled();
  const { showReadNav: read } = useReadEnabled();
  const tabs = sourcesTabs({ music: music.showMusicNav, watch, read });
  const tab = pickSourcesTab(searchParams.get("tab"), tabs);
  const search = searchParams.toString();
  const flash = useMemo(() => sourcesFlash(new URLSearchParams(search)), [search]);
  const overview = useResource({
    id: ["sources-overview"],
    load: () => api<SourcesOverview>("/sources"),
  });

  const onTabChange = (next: SourcesTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`/sources?${params.toString()}`, { scroll: false });
  };

  const props: MediaSourcesViewProps = {
    tabs,
    tab,
    loading: music.isLoading,
    onTabChange,
    overview,
    flash,
  };
  return cloneElements(children, props);
};
