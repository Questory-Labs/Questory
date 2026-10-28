import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
} as unknown as UseActionResult<GuardrailSettings, GuardrailSettings>;

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
    expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
  });

  it("marks severe categories and changed defaults", () => {
    const rows = settingsToDraft({
      ...settingsValue,
      categories: { ...settingsValue.categories, profanity: "block" },
    });
    renderView({ rows });
    expect(screen.getAllByText("Severe")).toHaveLength(4);
    expect(screen.getByText("mask · changed")).toBeInTheDocument();
  });

  it("changes a category action through the segmented control", () => {
    const updateDraft = vi.fn();
    renderView({ updateDraft });
    const group = screen.getByRole("group", { name: "Action for Profanity" });
    const rewrite = Array.from(group.querySelectorAll("button")).find(
      (b) => b.textContent === "Rewrite",
    );
    fireEvent.click(rewrite!);
    expect(updateDraft).toHaveBeenCalledWith({
      categories: expect.objectContaining({ profanity: "rewrite" }),
    });
  });

  it("sets the blocklist action", () => {
    const updateDraft = vi.fn();
    renderView({ updateDraft });
    const group = screen.getByRole("group", { name: "Blocklist action" });
    const mask = Array.from(group.querySelectorAll("button")).find(
      (b) => b.textContent === "Mask",
    );
    fireEvent.click(mask!);
    expect(updateDraft).toHaveBeenCalledWith({ blocklistAction: "mask" });
  });

  it("adds and removes blocklist phrases", () => {
    const updateDraft = vi.fn();
    const rows = settingsToDraft({
      ...settingsValue,
      blocklist: ["free keys", "giveaway link"],
    });
    renderView({ rows, updateDraft });
    fireEvent.click(screen.getByRole("button", { name: "Remove free keys" }));
    expect(updateDraft).toHaveBeenCalledWith({ blocklistText: "giveaway link" });
    fireEvent.change(screen.getByLabelText("Add phrase"), {
      target: { value: "  spam  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(updateDraft).toHaveBeenCalledWith({
      blocklistText: "free keys\ngiveaway link\nspam",
    });
  });

  it("skips duplicate blocklist phrases", () => {
    const updateDraft = vi.fn();
    const rows = settingsToDraft({ ...settingsValue, blocklist: ["Spam"] });
    renderView({ rows, updateDraft });
    fireEvent.change(screen.getByLabelText("Add phrase"), {
      target: { value: "spam" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(updateDraft).not.toHaveBeenCalled();
  });

  it("adds, edits and removes regex rules", () => {
    const updateDraft = vi.fn();
    const rows = settingsToDraft({
      ...settingsValue,
      regexRules: [{ pattern: "\\d+", action: "mask" }],
    });
    renderView({ rows, updateDraft });
    fireEvent.change(screen.getByLabelText("Regex pattern 1"), {
      target: { value: "abc" },
    });
    expect(updateDraft).toHaveBeenCalledWith({
      regexRules: [{ pattern: "abc", action: "mask" }],
    });
    fireEvent.click(screen.getByRole("button", { name: "Remove rule 1" }));
    expect(updateDraft).toHaveBeenCalledWith({ regexRules: [] });
    fireEvent.click(screen.getByRole("button", { name: "Add rule" }));
    expect(updateDraft).toHaveBeenCalledWith({
      regexRules: [
        { pattern: "\\d+", action: "mask" },
        { pattern: "", action: "block" },
      ],
    });
  });

  it("saves and resets when dirty", () => {
    const requestSave = vi.fn();
    const setDraft = vi.fn();
    const draft = settingsToDraft(settingsValue);
    renderView({ dirty: true, draft, requestSave, setDraft });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(requestSave).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /reset changes/i }));
    expect(setDraft).toHaveBeenCalledWith(null);
  });

  it("confirms before allowing a severe category", () => {
    const submit = vi.fn();
    const setConfirmOpen = vi.fn();
    const saved = settingsToDraft(settingsValue);
    const draft = {
      ...saved,
      categories: { ...saved.categories, illegal_activity: "allow" as const },
    };
    renderView({
      saved,
      draft,
      rows: draft,
      dirty: true,
      confirmOpen: true,
      setConfirmOpen,
      save: { ...idleSave, submit } as typeof idleSave,
    });
    expect(screen.getByText("Allow a severe category?")).toBeInTheDocument();
    expect(
      screen.getByText(/Illegal activity will no longer be blocked/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Keep blocked" }));
    expect(setConfirmOpen).toHaveBeenCalledWith(false);
    fireEvent.click(screen.getByRole("button", { name: "Allow anyway" }));
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({
        categories: expect.objectContaining({ illegal_activity: "allow" }),
      }),
    );
  });
});
