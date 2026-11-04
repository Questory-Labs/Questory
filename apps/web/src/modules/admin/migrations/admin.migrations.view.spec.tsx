import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { UseActionResult, UseResourceResult } from "@questorylabs/qhttp/react";
import { AdminMigrationsView } from "./admin.migrations.view";
import type {
  AdminMigrationsViewProps,
  MigrationItem,
  MigrationsResponse,
} from "./admin.migrations.types";

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

const idleRun = {
  submit: () => undefined,
  submitAsync: async () => undefined,
  reset: () => undefined,
  busy: false,
  failed: false,
  succeeded: false,
  error: null,
  value: undefined,
  input: undefined,
} as UseActionResult<unknown, string>;

const migration: MigrationItem = {
  key: "backfill-foo",
  name: "Backfill foo",
  description: "Repair foo rows",
  hasRun: false,
  status: "not_run",
  runCount: 0,
  lastStartedAt: null,
  lastCompletedAt: null,
  lastFailedAt: null,
  lastError: null,
  lastResult: null,
  canRun: true,
};

const renderView = (patch: Partial<AdminMigrationsViewProps>) =>
  render(
    <AdminMigrationsView
      {...({
        confirmKey: null,
        setConfirmKey: () => undefined,
        migrations: resource<MigrationsResponse>({
          empty: false,
          failed: false,
          value: { migrations: [migration] },
        }),
        run: idleRun,
        ...patch,
      } as AdminMigrationsViewProps)}
    />,
  );

describe("AdminMigrationsView", () => {
  afterEach(cleanup);

  it("shows skeletons when migrations are empty", () => {
    renderView({
      migrations: resource<MigrationsResponse>({ empty: true, failed: false }),
    });
    expect(screen.queryByText("Backfill foo")).not.toBeInTheDocument();
  });

  it("shows an error when migrations failed, even if empty", () => {
    renderView({
      migrations: resource<MigrationsResponse>({ empty: true, failed: true }),
    });
    expect(screen.getByText("fail")).toBeInTheDocument();
    expect(screen.queryByText("Backfill foo")).not.toBeInTheDocument();
  });

  it("renders migrations when ready", () => {
    renderView({});
    expect(screen.getByText("Backfill foo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run" })).toBeInTheDocument();
  });

  it("asks for confirmation before running", () => {
    const setConfirmKey = vi.fn();
    renderView({ setConfirmKey });
    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(setConfirmKey).toHaveBeenCalledWith("backfill-foo");
  });

  it("runs the confirmed migration from the dialog", () => {
    const submit = vi.fn();
    const setConfirmKey = vi.fn();
    renderView({
      confirmKey: "backfill-foo",
      setConfirmKey,
      run: { ...idleRun, submit } as typeof idleRun,
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Run migration?")).toBeInTheDocument();
    const runButtons = screen.getAllByRole("button", { name: "Run" });
    fireEvent.click(runButtons[runButtons.length - 1]);
    expect(submit).toHaveBeenCalledWith("backfill-foo");
    expect(setConfirmKey).toHaveBeenCalledWith(null);
  });

  it("shows collection empty when ready with no migrations", () => {
    renderView({
      migrations: resource<MigrationsResponse>({
        empty: false,
        failed: false,
        value: { migrations: [] },
      }),
    });
    expect(screen.getByText("No migrations are registered.")).toBeInTheDocument();
  });
});
