import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { UseActionResult, UseResourceResult } from "@questorylabs/qhttp/react";
import { AdminSettingsView } from "./admin.settings.view";
import type { AdminSettingsViewProps, Settings } from "./admin.settings.types";

const reload = async () => undefined;

const resource = <T,>(
  patch: Partial<UseResourceResult<T>> &
    Pick<UseResourceResult<T>, "empty" | "failed">,
): UseResourceResult<T> =>
  ({
    value: undefined,
    error: patch.failed ? new Error("fail") : null,
    busy: false,
    refreshing: false,
    updatedAt: 0,
    reload,
    ready: !patch.empty && !patch.failed,
    ...patch,
  }) as UseResourceResult<T>;

const idlePatch = {
  submit: () => undefined,
  submitAsync: async () => undefined,
  reset: () => undefined,
  busy: false,
  failed: false,
  succeeded: false,
  error: null,
  value: undefined,
  input: undefined,
} as UseActionResult<unknown, boolean>;

const settingsValue: Settings = {
  signupEnabled: true,
  signupOpen: true,
  abuse: { login: 2 },
};

const renderView = (patch: Partial<AdminSettingsViewProps>) =>
  render(
    <AdminSettingsView
      {...({
        settings: resource<Settings>({
          empty: false,
          failed: false,
          value: settingsValue,
        }),
        patch: idlePatch,
        ...patch,
      } as AdminSettingsViewProps)}
    />,
  );

describe("AdminSettingsView", () => {
  afterEach(cleanup);

  it("shows skeletons when settings are empty", () => {
    renderView({
      settings: resource<Settings>({ empty: true, failed: false }),
    });
    expect(screen.queryByText("Signup")).not.toBeInTheDocument();
  });

  it("shows an error when settings failed, even if empty", () => {
    renderView({
      settings: resource<Settings>({ empty: true, failed: true }),
    });
    expect(screen.getByText("fail")).toBeInTheDocument();
    expect(screen.queryByText("Signup")).not.toBeInTheDocument();
  });

  it("renders signup and abuse panels when ready", () => {
    renderView({});
    expect(screen.getByText("Signup")).toBeInTheDocument();
    expect(screen.getByText("Abuse metrics")).toBeInTheDocument();
    expect(screen.getByText("Enable signup")).toBeInTheDocument();
  });
});
