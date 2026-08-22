import type {
  GuardrailAction,
  GuardrailSettings,
} from "@/lib/enterprise-api";
import { ACTIONS, CATEGORY_META } from "./enterprise.guardrails.constants";
import type { CategoryId, DraftState } from "./enterprise.guardrails.types";

export const emptyCategories = (): Record<CategoryId, GuardrailAction> =>
  Object.fromEntries(
    CATEGORY_META.map((c) => [c.id, c.defaultAction]),
  ) as Record<CategoryId, GuardrailAction>;

export const settingsToDraft = (
  data: GuardrailSettings | undefined,
): DraftState => {
  const categories = emptyCategories();
  for (const meta of CATEGORY_META) {
    const action = data?.categories?.[meta.id];
    if (ACTIONS.includes(action as GuardrailAction)) {
      categories[meta.id] = action as GuardrailAction;
    }
  }
  return {
    categories,
    blocklistText: (data?.blocklist ?? []).join("\n"),
    blocklistAction: ACTIONS.includes(data?.blocklistAction as GuardrailAction)
      ? (data!.blocklistAction as GuardrailAction)
      : "block",
    regexRules: (data?.regexRules ?? []).map((r) => ({
      pattern: r.pattern,
      action: ACTIONS.includes(r.action) ? r.action : "block",
    })),
  };
};

export const draftToPayload = (draft: DraftState): GuardrailSettings => ({
  categories: draft.categories,
  blocklist: draft.blocklistText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean),
  blocklistAction: draft.blocklistAction,
  regexRules: draft.regexRules
    .map((r) => ({
      pattern: r.pattern.trim(),
      action: r.action,
    }))
    .filter((r) => r.pattern.length > 0),
});

export const severeAllowDowngrades = (
  saved: DraftState,
  draft: DraftState,
): string[] =>
  CATEGORY_META.filter(
    (c) =>
      c.severe &&
      (saved.categories[c.id] ?? c.defaultAction) === "block" &&
      draft.categories[c.id] === "allow",
  ).map((c) => c.label);
