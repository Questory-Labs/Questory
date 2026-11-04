"use client";

import { FamilyGameSidebar } from "@/components/FamilyGameSidebar";
import { TRENDING_TABS } from "./steam.trending.constants";
import type { TrendingViewProps } from "./steam.trending.types";
import { GameShelves } from "./components/GameShelves";
import { MediaWorldShelves } from "./components/MediaWorldShelves";
import { TrendingInsightHero } from "./components/TrendingInsightHero";
import { TrendingTabs } from "./components/TrendingTabs";

export const TrendingView = (props: Record<string, unknown>) => {
  const {
    friends,
    global,
    concurrent,
    deck,
    topReleases,
    showMusic = false,
    showWatch = false,
    showRead = false,
    showEnterprise = false,
    music,
    watch,
    read,
    digest,
    selectedAppId,
    setSelectedAppId,
    tab = "games",
    setTab = () => undefined,
  } = props as TrendingViewProps;

  const enabled = { games: true, music: showMusic, watch: showWatch, read: showRead };
  const tabs = TRENDING_TABS.filter((t) => enabled[t.value]).map((t) => t.value);
  const current = tabs.includes(tab) ? tab : "games";
  const accent = TRENDING_TABS.find((t) => t.value === current)?.color;

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-[26px]">
      <header className="q-in flex flex-wrap items-end justify-between gap-4 px-1 pt-2">
        <div>
          <p className="m-0 font-mono text-[11px] uppercase tracking-[0.08em] text-faint">
            Worldwide public charts · friends first
          </p>
          <h1 className="mt-1.5 text-[clamp(34px,4vw,52px)] font-light leading-none tracking-[-0.035em]">
            Trending{" "}
            <em className="font-serif" style={{ color: accent }}>
              right now
            </em>
          </h1>
        </div>
        <TrendingTabs tabs={tabs} value={current} onChange={setTab} />
      </header>

      {showEnterprise && digest ? <TrendingInsightHero digest={digest} /> : null}

      {current === "games" ? (
        <GameShelves
          friends={friends}
          global={global}
          concurrent={concurrent}
          deck={deck}
          topReleases={topReleases}
          onSelect={setSelectedAppId}
        />
      ) : (
        <MediaWorldShelves
          showMusic={current === "music"}
          showWatch={current === "watch"}
          showRead={current === "read"}
          music={music}
          watch={watch}
          read={read}
        />
      )}

      <FamilyGameSidebar
        appId={selectedAppId}
        variant="friends"
        onClose={() => setSelectedAppId(null)}
      />
    </div>
  );
};
