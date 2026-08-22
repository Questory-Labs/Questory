import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { UseActionResult } from "@questorylabs/qhttp/react";
import { mockResource } from "@/test/resource-mock";
import type { GuardrailSettings } from "@/lib/enterprise-api";
import { GuardrailsView } from "./enterprise.guardrails.view";
import type { GuardrailsViewProps } from "./enterprise.guardrails.types";
import { settingsToDraft } from "./enterprise.guardrails.utils";

const idleSave = {
  submit: () => undefined,
  submitAsync: async () => undefined,
  reset: () => undefined,
  busy: false,
  failed: false,
  succeeded: false,
  error: null,
  value: undefined,
  input: undefined,
} as UseActionResult<GuardrailSettings, GuardrailSettings>;

const settingsValue: GuardrailSettings = {
  categories: { profanity: "mask", illegal_activity: "block" },
  blocklist: [],
  blocklistAction: "block",
  regexRules: [],
};

const defaultDraft = settingsToDraft(undefined);

const renderView = (patch: Partial<GuardrailsViewProps> = {}) =>
  render(
    <GuardrailsView
      {...({
        enabled: true,
        isLoading: false,
        settings: mockResource<GuardrailSettings>({
          empty: false,
          failed: false,
          value: settingsValue,
        }),
        rows: settingsToDraft(settingsValue),
        saved: settingsToDraft(settingsValue),
        draft: null,
        dirty: false,
        confirmOpen: false,
        save: idleSave,
        updateDraft: () => undefined,
        requestSave: () => undefined,
        setDraft: () => undefined,
        setConfirmOpen: () => undefined,
        ...patch,
      } as GuardrailsViewProps)}
    />,
  );

describe("GuardrailsView", () => {
  afterEach(cleanup);

  it("shows an error when settings failed, even if empty", () => {
    renderView({
      settings: mockResource<GuardrailSettings>({ empty: true, failed: true }),
      rows: defaultDraft,
      saved: defaultDraft,
    });
    expect(screen.getByText("fail")).toBeInTheDocument();
    expect(screen.queryByText("Illegal activity")).not.toBeInTheDocument();
    expect(screen.queryByText("Loading guardrails…")).not.toBeInTheDocument();
  });

  it("shows a loading message when settings are empty", () => {
    renderView({
      settings: mockResource<GuardrailSettings>({ empty: true, failed: false }),
      rows: defaultDraft,
      saved: defaultDraft,
    });
    expect(screen.getByText("Loading guardrails…")).toBeInTheDocument();
    expect(screen.queryByText("Illegal activity")).not.toBeInTheDocument();
  });

  it("renders category rows when ready", () => {
    renderView({});
    expect(screen.getByText("Illegal activity")).toBeInTheDocument();
    expect(screen.getByText("Profanity")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save guardrails/i })).toBeDisabled();
  });
});
