import type { Dispatch, SetStateAction } from "react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type {
  RewindInsightResponse,
  RewindStatsResponse,
} from "@questorylabs/shared";

export type RewindDomain = "music" | "watch" | "read";

export type RewindMonth = number | "all";

export type PatternKind =
  | "checkerboard"
  | "concentric-rings"
  | "polka-dots"
  | "film-bars"
  | "ticket-stub"
  | "scanlines"
  | "paper-noise"
  | "margin-line"
  | "diagonal-stripes";

export type DecorationKind = "vignette" | "rec-badge" | "margin-line" | "none";

export type PatternSpec = {
  kind: PatternKind;
  color: string;
  colorAlt?: string;
  opacity?: number;
};

export type RewindCardTheme = {
  container: string;
  title: string;
  text: string;
  highlight: string;
  pattern: PatternSpec;
  decoration: DecorationKind;
  /** Bottom fade hint when content scrolls */
  scrollFade: string;
};

export type DomainPalette = {
  surface: string;
  surfaceAlt: string;
  accent: string;
  accentMuted: string;
  ink: string;
  inkMuted: string;
  highlightBg: string;
  highlightFg: string;
  border?: string;
};

export type DomainIdentity = {
  domain: RewindDomain;
  label: string;
  palette: DomainPalette;
  titleFont: string;
  bodyFont: string;
  patternPool: PatternKind[];
};

export type ParsedInsightChunk = {
  title: string;
  text: string;
  tagSlug: string;
};

export type EmphasisSegment = {
  bold: boolean;
  italic: boolean;
  value: string;
};

export type RewindViewProps = {
  domain: RewindDomain;
  year: number;
  month: RewindMonth;
  setMonth: Dispatch<SetStateAction<RewindMonth>>;
  handleYearChange: (year: number) => void;
  handleRedo: () => void;
  enterpriseEnabled: boolean;
  statsQuery: UseResourceResult<RewindStatsResponse>;
  aiQuery: UseResourceResult<RewindInsightResponse>;
  availableMonths: number[];
  hasCompletedMonths: boolean;
  period: string;
  aiGenerationAllowed: boolean;
  aiPeriodError: string | null;
  forceRedo: boolean;
};
