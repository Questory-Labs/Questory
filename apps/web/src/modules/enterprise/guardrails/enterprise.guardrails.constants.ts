import type { GuardrailAction } from "@/lib/enterprise-api";

export const ACTIONS: GuardrailAction[] = ["allow", "mask", "rewrite", "block"];

export const CATEGORY_META = [
  {
    id: "illegal_activity",
    label: "Illegal activity",
    description: "Instructions for serious crimes (weapons, drugs, fraud, hacking).",
    severe: true,
    defaultAction: "block" as const,
  },
  {
    id: "self_harm",
    label: "Self-harm",
    description: "Suicide or self-harm encouragement and how-to content.",
    severe: true,
    defaultAction: "block" as const,
  },
  {
    id: "hate_speech",
    label: "Hate speech",
    description: "Slurs and dehumanizing language about protected groups.",
    severe: true,
    defaultAction: "block" as const,
  },
  {
    id: "harassment",
    label: "Harassment",
    description: "Targeted insults, threats, and bullying language.",
    severe: true,
    defaultAction: "block" as const,
  },
  {
    id: "violence",
    label: "Violence / gore",
    description: "Graphic violence descriptions (catalog blurbs may reference mature themes).",
    severe: false,
    defaultAction: "mask" as const,
  },
  {
    id: "sexual_content",
    label: "Sexual content",
    description: "Explicit adult sexual content in prompts or model output.",
    severe: false,
    defaultAction: "mask" as const,
  },
  {
    id: "pii",
    label: "Personal data (PII)",
    description: "SSNs, card numbers, phone numbers, and address-like patterns.",
    severe: false,
    defaultAction: "mask" as const,
  },
  {
    id: "profanity",
    label: "Profanity",
    description: "Cursing and vulgar language.",
    severe: false,
    defaultAction: "mask" as const,
  },
] as const;

export type CategoryId = (typeof CATEGORY_META)[number]["id"];
