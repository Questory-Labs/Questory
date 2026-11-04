import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MigrationCard } from "./MigrationCard";
import type { MigrationItem } from "../admin.migrations.types";

const base: MigrationItem = {
  key: "normalize_ids",
  name: "Merge duplicate titles",
  description: "Repair rows",
  hasRun: true,
  status: "failed",
  runCount: 2,
  lastStartedAt: "2026-01-01T00:00:00.000Z",
  lastCompletedAt: null,
  lastFailedAt: "2026-01-01T00:02:00.000Z",
  lastError: "TMDB 503",
  lastResult: '{"rows":3}',
  canRun: true,
};

describe("MigrationCard", () => {
  afterEach(cleanup);

  it("shows a failed migration with retry, error, meta and result", () => {
    const onRequest = vi.fn();
    render(<MigrationCard migration={base} busy={false} running={false} onRequest={onRequest} />);
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("TMDB 503")).toBeInTheDocument();
    expect(screen.getByText(/^Runs 2 · started .* · failed /)).toBeInTheDocument();
    expect(screen.getByText(/"rows": 3/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRequest).toHaveBeenCalledWith("normalize_ids");
  });

  it("hides the action when the migration cannot run", () => {
    render(
      <MigrationCard
        migration={{ ...base, status: "completed", canRun: false, lastError: null }}
        busy={false}
        running={false}
        onRequest={() => undefined}
      />,
    );
    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows running state for the active migration", () => {
    render(<MigrationCard migration={base} busy running onRequest={() => undefined} />);
    expect(screen.getByRole("button", { name: "Running…" })).toBeDisabled();
  });
});
