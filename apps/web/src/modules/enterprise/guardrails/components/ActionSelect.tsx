"use client";

import { SegmentedControl } from "@/components/SegmentedControl";
import type { GuardrailAction } from "@/lib/enterprise-api";
import { ACTIONS } from "../enterprise.guardrails.constants";

const OPTIONS = ACTIONS.map((action) => ({
  value: action,
  label: action[0].toUpperCase() + action.slice(1),
}));

export const ActionSelect = ({
  value,
  onChange,
  label,
}: {
  value: GuardrailAction;
  onChange: (value: GuardrailAction) => void;
  label: string;
}) => (
  <SegmentedControl
    label={label}
    value={value}
    onChange={onChange}
    options={OPTIONS}
  />
);
