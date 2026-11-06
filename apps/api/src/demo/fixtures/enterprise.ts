import type { DemoRoute } from "../demo.types";
import {
  curateIndexForBody,
  curateIndexForJobId,
  curateJob,
} from "./enterprise-curate";
import { aiGoals, smartGoals } from "./enterprise-goals";
import {
  clustersPreview,
  curateCache,
  recommendationHistory,
  recommendations,
  semanticSearch,
} from "./enterprise-recs";
import { dossierView, userSettings, weeklyDigest } from "./enterprise-taste";

export const enterpriseRoutes: DemoRoute[] = [
  { method: "POST", pattern: "/recommendations", respond: recommendations },
  {
    method: "POST",
    pattern: "/recommendations/curate",
    respond: (ctx) => curateJob(curateIndexForBody(ctx.body)),
  },
  { method: "POST", pattern: "/recommendations/curate/cache", respond: curateCache },
  { method: "POST", pattern: "/recommendations/goals", respond: smartGoals },
  { method: "POST", pattern: "/recommendations/goals/ai", respond: aiGoals },
  { method: "POST", pattern: "/recommendations/search", respond: semanticSearch },
  { method: "POST", pattern: "/recommendations/weekly-digest", respond: weeklyDigest },
  { method: "POST", pattern: "/recommendations/weekly-digest/cache", respond: weeklyDigest },
  {
    method: "GET",
    pattern: "/recommendations/curate/:id",
    respond: (ctx) => curateJob(curateIndexForJobId(ctx.params.id)),
  },
  { method: "GET", pattern: "/recommendations/history", respond: recommendationHistory },
  { method: "GET", pattern: "/recommendations/clusters/preview", respond: clustersPreview },
  { method: "GET", pattern: "/enterprise/dossier", respond: dossierView },
  { method: "GET", pattern: "/enterprise/settings", respond: userSettings },
];
