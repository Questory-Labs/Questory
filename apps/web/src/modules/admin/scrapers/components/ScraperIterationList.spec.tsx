import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ScraperIterationRecord } from "@questorylabs/shared";
import { ScraperIterationList } from "./ScraperIterationList";

const iteration = (
  patch: Partial<ScraperIterationRecord>,
): ScraperIterationRecord =>
  ({
    id: "it-1",
    version: 1,
    label: null,
    status: "draft",
    config: {},
    publishedAt: null,
    validatedAt: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...patch,
  }) as ScraperIterationRecord;

describe("ScraperIterationList", () => {
  afterEach(cleanup);

  it("renders the open, live and retired iterations as a timeline", () => {
    const onSelect = vi.fn();
    render(
      <ScraperIterationList
        open={iteration({ id: "v4", version: 4, status: "validated" })}
        current={iteration({
          id: "v3",
          version: 3,
          status: "published",
          publishedAt: "2026-10-12T00:00:00.000Z",
        })}
        previous={[iteration({ id: "v2", version: 2, status: "archived" })]}
        selectedId="v3"
        onSelect={onSelect}
      />,
    );
    expect(screen.getByText("Validated")).toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.getByText("Retired")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /v3 ·/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: /v2 ·/ }));
    expect(onSelect).toHaveBeenCalledWith("v2");
  });

  it("shows an empty message without iterations", () => {
    render(
      <ScraperIterationList
        current={null}
        previous={[]}
        selectedId={null}
        onSelect={() => undefined}
      />,
    );
    expect(screen.getByText("No published iteration yet.")).toBeInTheDocument();
  });
});
