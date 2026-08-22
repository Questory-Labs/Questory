import type { UseActionResult, UseResourceResult } from "@questorylabs/qhttp/react";
import type {
  GuardrailAction,
  GuardrailRegexRule,
  GuardrailSettings,
} from "@/lib/enterprise-api";
import type { CategoryId } from "./enterprise.guardrails.constants";

export type { CategoryId };

export type DraftState = {
  categories: Record<CategoryId, GuardrailAction>;
  blocklistText: string;
  blocklistAction: GuardrailAction;
  regexRules: GuardrailRegexRule[];
};

export type GuardrailsViewProps = {
  enabled: boolean;
  isLoading: boolean;
  settings: UseResourceResult<GuardrailSettings>;
  rows: DraftState;
  saved: DraftState;
  draft: DraftState | null;
  dirty: boolean;
  confirmOpen: boolean;
  save: UseActionResult<GuardrailSettings, GuardrailSettings>;
  updateDraft: (patch: Partial<DraftState>) => void;
  requestSave: () => void;
  setDraft: (draft: DraftState | null) => void;
  setConfirmOpen: (open: boolean) => void;
};
