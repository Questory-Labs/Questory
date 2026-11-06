import type { DemoRoute } from "../demo.types";
import {
  familyGameDetail,
  familyGroup,
  familyInsights,
  familyLibrary,
} from "./social-family";
import { friendCompare, friendsList } from "./social-friends";
import { multiplayerPlan } from "./social-multiplayer";
import {
  concurrentShelf,
  deckShelf,
  friendsShelf,
  globalShelf,
  topReleasesShelf,
  trendingAll,
} from "./social-trending";

export const socialRoutes: DemoRoute[] = [
  { method: "GET", pattern: "/friends", respond: friendsList },
  { method: "GET", pattern: "/friends/:steamId/compare", respond: friendCompare },
  { method: "GET", pattern: "/family", respond: familyGroup },
  { method: "GET", pattern: "/family/library", respond: familyLibrary },
  { method: "GET", pattern: "/family/insights", respond: familyInsights },
  { method: "GET", pattern: "/family/games/:appId", respond: familyGameDetail },
  { method: "GET", pattern: "/trending", respond: trendingAll },
  { method: "GET", pattern: "/trending/friends", respond: friendsShelf },
  { method: "GET", pattern: "/trending/global", respond: globalShelf },
  { method: "GET", pattern: "/trending/concurrent", respond: concurrentShelf },
  { method: "GET", pattern: "/trending/deck", respond: deckShelf },
  { method: "GET", pattern: "/trending/top-releases", respond: topReleasesShelf },
  {
    method: "POST",
    pattern: "/multiplayer/plan",
    respond: (ctx) => multiplayerPlan(ctx.body),
  },
];
