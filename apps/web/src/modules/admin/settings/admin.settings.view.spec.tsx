import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { UseActionResult, UseResourceResult } from "@questorylabs/qhttp/react";
import type {
  AdminInstanceSettings,
  FeatureFlagOrigin,
  PatchFeatureFlags,
} from "@questorylabs/shared";
import { FEATURE_SOURCES } from "@questorylabs/shared";
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
} as unknown as UseActionResult<Settings, PatchFeatureFlags>;

const flag = (enabled: boolean, origin: FeatureFlagOrigin = "default") => ({
  enabled,
  origin,
});

const settingsValue: Settings = {
  signupEnabled: true,
  signupOpen: true,
  abuse: { loginLockout: 2 },
  limits: [{ key: "loginIp", max: 20, windowSeconds: 900 }],
  features: {
    music: flag(true, "env"),
    watch: flag(false, "default"),
    read: flag(true, "db"),
  },
  sources: Object.fromEntries(
    FEATURE_SOURCES.map((id) => [id, flag(true)]),
  ) as AdminInstanceSettings["sources"],
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
    expect(screen.queryByText("Open signup")).not.toBeInTheDocument();
  });

  it("shows an error when settings failed, even if empty", () => {
    renderView({
      settings: resource<Settings>({ empty: true, failed: true }),
    });
    expect(screen.getByText("fail")).toBeInTheDocument();
    expect(screen.queryByText("Open signup")).not.toBeInTheDocument();
  });

  it("renders access, source, limit and abuse panels when ready", () => {
    renderView({});
    expect(screen.getByText("Access and modules")).toBeInTheDocument();
    expect(screen.getByText("Data sources")).toBeInTheDocument();
    expect(screen.getByText("Abuse limits")).toBeInTheDocument();
    expect(screen.getByText("Abuse metrics")).toBeInTheDocument();
    expect(screen.getByText("Login attempts per IP")).toBeInTheDocument();
    expect(screen.getByText("20 / 15 min")).toBeInTheDocument();
    expect(screen.getByText("Login lockouts")).toBeInTheDocument();
    expect(screen.getByText("From environment")).toBeInTheDocument();
    expect(screen.getByText("Saved in Admin")).toBeInTheDocument();
    expect(screen.getAllByRole("switch")).toHaveLength(1 + 3 + FEATURE_SOURCES.length);
  });

  it("patches signup, features and sources through the switches", () => {
    const submit = vi.fn();
    renderView({ patch: { ...idlePatch, submit } as typeof idlePatch });
    fireEvent.click(screen.getByRole("switch", { name: "Open signup" }));
    expect(submit).toHaveBeenCalledWith({ signupEnabled: false });
    fireEvent.click(screen.getByRole("switch", { name: "Watch" }));
    expect(submit).toHaveBeenCalledWith({ features: { watch: true } });
    fireEvent.click(screen.getByRole("switch", { name: "Trakt" }));
    expect(submit).toHaveBeenCalledWith({ sources: { trakt: false } });
  });
});
