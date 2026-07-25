/** Mirrors questorylabs-enterprise JSON contracts (Rust Axum service). */

export type RecommendationDomain = "games" | "music" | "watch";

export type RecommendationItemKind =
  | "game"
  | "artist"
  | "track"
  | "movie"
  | "show";

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
  /** Stable feedback key ("game:<id>" / "artist:<id>" / "title:<id>"). */
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
};

/* ── feedback ── */

export type FeedbackAction = "like" | "dislike" | "dismiss";

/* ── taste dossier ── */

export type Dossier = {
  identity: string;
  gaming: string;
  music: string;
  watch: string;
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
