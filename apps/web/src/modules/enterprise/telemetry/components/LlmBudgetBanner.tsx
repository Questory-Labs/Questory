"use client";

import Link from "next/link";
import { useResource } from "@questorylabs/qhttp/react";
import { fetchLlmBudget } from "@/lib/enterprise-api";
import { budgetBannerLines } from "../enterprise.telemetry.budget";

export const LLM_BUDGET_RESOURCE = "enterprise-llm-budget";

export const LlmBudgetBanner = () => {
  const budget = useResource({
    id: [LLM_BUDGET_RESOURCE],
    load: fetchLlmBudget,
    refreshEvery: 60_000,
    retries: false,
  });
  const lines = budget.value ? budgetBannerLines(budget.value) : [];
  if (lines.length === 0) return null;
  return (
    <div
      role="alert"
      className="mb-5 flex items-start gap-3 rounded-[var(--radius)] border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3 text-sm"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className="mt-0.5 shrink-0 text-[var(--danger)]"
      >
        <path
          d="M12 4 3 20h18L12 4Zm0 6v5m0 2.5v.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="min-w-0">
        <p className="font-medium text-[var(--ink)]">LLM budget stop active</p>
        <ul className="mt-1 space-y-0.5 break-words text-[var(--muted)]">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="mt-1 text-[var(--muted)]">
          Affected AI features are skipped without showing users an error.{" "}
          <Link
            href="/admin/telemetry#llm-budget"
            className="text-[var(--ink)] underline underline-offset-2"
          >
            Review budget
          </Link>
        </p>
      </div>
    </div>
  );
};
