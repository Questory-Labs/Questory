/** Mirrors QEngine JSON contracts (Rust Axum service). */

export type RecommendationDomain = "games" | "music" | "watch" | "read";

export type RecommendationItemKind =
  | "game"
  | "artist"
  | "track"
  | "movie"
  | "show"
  | "manga"
  | "external"
  | "lifestyle";

export type RecommendationItem = {
  kind: RecommendationItemKind;
  domain: RecommendationDomain;
  gameId?: string;
  appId?: number;
  titleId?: string;
  artistId?: string;
  trackId?: string;
  name: string;
  imageUrl?: string | null;
  score: number;
  reasons: string[];
  /** One-line editorial blurb. */
  blurb?: string;
  /** Curator's argument for this pick (LLM-ranked slates only). */
  why?: string;
  /** Stable feedback key ("game:<id>" / "artist:<id>" / "title:<id>" / "read:<id>"). */
  itemKey?: string;
  /** Outbound link for extra (not-in-library) cards. */
  url?: string;
  cardType?: string;
};

export type MlStatus = {
  enabled: boolean;
  ready: boolean;
  model?: string;
  error?: string;
};

export type LlmTierStatus = {
  tier: "reason" | "write" | "fast";
  model: string;
  fallbacks?: string[];
  reasoning: string;
};

export type LlmStatus = {
  enabled: boolean;
  ready: boolean;
  model?: string;
  tiers?: LlmTierStatus[];
  embedModel?: string;
  pulling?: string[];
  error?: string;
};

export type PlanStep = {
  itemIndex?: number;
  note: string;
};

export type Plan = {
  title: string;
  steps: PlanStep[];
};

export type RecommendationResponse = {
  available: boolean;
  engine: string | null;
  userId?: string;
  generatedAt?: string;
  ml?: MlStatus;
  llm?: LlmStatus;
  moodSummary?: string;
  plan?: Plan;
  worldSummary?: string;
  items: RecommendationItem[];
  /** In-catalog strip when research picks are the primary list. */
  library?: RecommendationItem[];
  message?: string;
  /** Which ranker produced the slate. */
  arm?: RecommendationArm;
};

export type RecommendationArm =
  | "heuristic"
  | "rerank"
  | "rerank-fallback"
  | "interleave"
  | "research";

export type RecommendationHistoryItem = {
  itemKey: string;
  name: string;
  domain: string;
  rank: number;
  why?: string | null;
  owned: boolean;
  feedback?: FeedbackAction | null;
};

export type RecommendationHistorySlate = {
  slateId: string;
  arm: string;
  source: string;
  ask: string;
  servedAt: number;
  items: RecommendationHistoryItem[];
};

export type RecommendationHistory = {
  slates: RecommendationHistorySlate[];
  liked: string[];
  passed: string[];
};

/* ── smart goals ── */

export type GoalSuggestion = {
  itemKey: string;
  name: string;
  domain: RecommendationDomain;
  kind: RecommendationItemKind;
  estimatedTimeMinutes?: number;
  reason: string;
};

export type RecommendationGoalsRequest = {
  userId?: string;
  targetCount: number;
  timeframe: string;
};

export type RecommendationGoalsResponse = {
  generatedAt: string;
  timeframe: string;
  targetCount: number;
  suggestions: GoalSuggestion[];
};

/* ── curation jobs ── */

export type JobStatus =
  | "queued"
  | "scoring"
  | "extras"
  | "researching"
  | "curating"
  | "writing"
  | "done"
  | "failed";

export type JobEvent = {
  ts: number;
  stage: string;
  message: string;
};

export type JobStage = {
  id: string;
  label: string;
  hint: string;
};

export type CurationJob = {
  jobId: string;
  status: JobStatus;
  events: JobEvent[];
  result?: RecommendationResponse;
  error?: string;
  /** True when the finished result was served from the curated cache. */
  fromCache?: boolean;
  /** Stepper for this run. Owned by QEngine. */
  stages?: JobStage[];
};

export type CurateCacheView = {
  cached: boolean;
  result?: RecommendationResponse;
};

/* ── feedback ── */

export type FeedbackAction = "like" | "dislike" | "dismiss";

/* ── taste dossier ── */

export type Dossier = {
  identity: string;
  gaming: string;
  music: string;
  watch: string;
  read?: string;
  currentVibe: string;
  keywords: string[];
};

export type DossierView = {
  available: boolean;
  dossier?: Dossier;
  updatedAt?: number;
  refreshing?: boolean;
  error?: string;
};

/* ── user settings (location) ── */

export type UserSettings = {
  country?: string;
  state?: string;
  city?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
};
