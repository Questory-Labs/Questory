import type { DemoRoute } from "../demo.types";
import { llmBudget } from "./enterprise-budget";
import { otelHealth, otelPricing, otelUsage } from "./enterprise-telemetry";
import { otelTrace, otelTraces } from "./enterprise-traces";

function guardrails() {
  return {
    categories: {
      illegal_activity: "block",
      self_harm: "block",
      hate_speech: "block",
      harassment: "block",
      violence: "mask",
      sexual_content: "mask",
      pii: "mask",
      profanity: "rewrite",
    },
    blocklist: ["free steam keys", "account boosting", "cheat engine download"],
    blocklistAction: "block",
    regexRules: [
      { pattern: "\\b\\d{3}-\\d{2}-\\d{4}\\b", action: "mask" },
      { pattern: "(?i)steam[ _-]?guard\\s+code", action: "block" },
    ],
  };
}

export const adminEnterpriseRoutes: DemoRoute[] = [
  { method: "GET", pattern: "/enterprise/guardrails", respond: guardrails },
  { method: "GET", pattern: "/enterprise/llm/budget", respond: llmBudget },
  { method: "GET", pattern: "/enterprise/otel/health", respond: otelHealth },
  { method: "GET", pattern: "/enterprise/otel/usage", respond: otelUsage },
  { method: "GET", pattern: "/enterprise/otel/pricing", respond: otelPricing },
  { method: "GET", pattern: "/enterprise/otel/traces", respond: otelTraces },
  { method: "GET", pattern: "/enterprise/otel/traces/:traceId", respond: otelTrace },
];
