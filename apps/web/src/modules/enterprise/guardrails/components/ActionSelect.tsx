"use client";

import type { GuardrailAction } from "@/lib/enterprise-api";
import { ACTIONS } from "../enterprise.guardrails.constants";

export const ActionSelect = ({
  value,
  onChange,
  label,
}: {
  value: GuardrailAction;
  onChange: (value: GuardrailAction) => void;
  label: string;
}) => (
  <select
    className="rounded border border-[var(--line)] bg-[var(--bg-0)] px-2 py-1.5 text-sm"
    value={value}
    onChange={(e) => onChange(e.target.value as GuardrailAction)}
    aria-label={label}
  >
    {ACTIONS.map((action) => (
      <option key={action} value={action}>
        {action}
      </option>
    ))}
  </select>
);
