/** Mirrors QEngine JSON contracts (Rust Axum service). */

export type RecommendationDomain = "games" | "music" | "watch" | "read";

export type RecommendationItemKind =
  | "game"
  | "artist"
  | "track"
  | "movie"
  | "show"
  | "manga";

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
  /** One-line editorial blurb from the Composer (LLM mode only). */
  blurb?: string;
  /** Stable feedback key ("game:<id>" / "artist:<id>" / "title:<id>" / "read:<id>"). */
  itemKey?: string;
};

export type MlStatus = {
  enabled: boolean;
  ready: boolean;
  model?: string;
  error?: string;
};

export type LlmStatus = {
  enabled: boolean;
  ready: boolean;
  model?: string;
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
  message?: string;
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
  userId: string;
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
  | "scouting"
  | "ranking"
  | "validating"
  | "composing"
  | "done"
  | "failed";

export type JobEvent = {
  ts: number;
  stage: string;
  message: string;
};

export type CurationJob = {
  jobId: string;
  status: JobStatus;
  events: JobEvent[];
  result?: RecommendationResponse;
  error?: string;
  /** True when the finished result was served from the curated cache. */
  fromCache?: boolean;
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
