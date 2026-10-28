import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { GoalSuggestion } from "@/lib/enterprise-types";
import { SuggestionRow } from "./SuggestionRow";

const suggestion: GoalSuggestion = {
  itemKey: "title:9",
  name: "Severance",
  domain: "watch",
  kind: "show",
  estimatedTimeMinutes: 90,
  reason: "Five episodes left.",
};

describe("SuggestionRow", () => {
  afterEach(cleanup);

  it("renders the suggestion and accepts it", () => {
    const onAccept = vi.fn();
    render(
      <ul>
        <SuggestionRow suggestion={suggestion} busy={false} disabled={false} onAccept={onAccept} />
      </ul>,
    );
    expect(screen.getByText("Watch")).toBeInTheDocument();
    expect(screen.getByText("~1.5h")).toBeInTheDocument();
    expect(screen.getByText("Five episodes left.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Accept Severance" }));
    expect(onAccept).toHaveBeenCalledWith(suggestion);
  });

  it("shows progress while accepting", () => {
    render(
      <ul>
        <SuggestionRow suggestion={suggestion} busy disabled onAccept={vi.fn()} />
      </ul>,
    );
    expect(screen.getByRole("button", { name: "Accept Severance" })).toBeDisabled();
    expect(screen.getByText("Adding…")).toBeInTheDocument();
  });
});
