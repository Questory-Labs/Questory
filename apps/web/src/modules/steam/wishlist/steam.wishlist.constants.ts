import type { DealAlert } from "@questorylabs/shared";

export const DEAL_LABELS: Record<DealAlert["reason"], string> = {
  target: "Target hit",
  historical_low: "Near low",
  strong_score: "Strong score",
};
