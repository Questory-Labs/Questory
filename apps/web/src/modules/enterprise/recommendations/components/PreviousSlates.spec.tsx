import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ResourceStore, ResourceProvider } from "@questorylabs/qhttp/react";
import { PreviousSlates } from "./PreviousSlates";

vi.mock("@/lib/enterprise-api", () => ({
  fetchRecommendationHistory: vi.fn(),
}));

import { fetchRecommendationHistory } from "@/lib/enterprise-api";

const historyMock = vi.mocked(fetchRecommendationHistory);

const slate = (
  slateId: string,
  source: string,
  keys: string[],
) => ({
  slateId,
  arm: "rerank",
  source,
  ask: "cozy rainy evening",
  servedAt: Date.UTC(2026, 9, 17),
  items: keys.map((key, rank) => ({
    itemKey: key,
    name: `Name ${key}`,
    domain: "games",
    rank,
    why: rank === 0 ? `Argued for ${key}` : null,
    owned: false,
    feedback: null,
  })),
});

function renderStrip(
  currentKeys: string[],
  onFeedback = vi.fn(),
) {
  const client = new ResourceStore({ retries: false });
  render(
    <ResourceProvider store={client}>
      <PreviousSlates
        currentKeys={new Set(currentKeys)}
        votes={{}}
        onFeedback={onFeedback}
      />
    </ResourceProvider>,
  );
  return onFeedback;
}

describe("PreviousSlates", () => {
  beforeEach(() => historyMock.mockReset());
  afterEach(cleanup);

  it("shows earlier curated slates, skipping the current one and fast-path slates", async () => {
    historyMock.mockResolvedValue({
      slates: [
        slate("now", "curate", ["a", "b"]),
        slate("fast", "recommend", ["c"]),
        slate("old", "curate", ["d", "e"]),
      ],
      liked: [],
      passed: [],
    });
    const onFeedback = renderStrip(["a", "b"]);
    expect(await screen.findByText("Name d")).toBeInTheDocument();
    expect(screen.getByText("Argued for d")).toBeInTheDocument();
    expect(screen.queryByText("Name a")).not.toBeInTheDocument();
    expect(screen.queryByText("Name c")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Like Name e" }));
    expect(onFeedback).toHaveBeenCalledWith({ itemKey: "e" }, "like");
  });

  it("renders nothing without history", async () => {
    historyMock.mockResolvedValue({ slates: [], liked: [], passed: [] });
    renderStrip([]);
    await vi.waitFor(() => expect(historyMock).toHaveBeenCalled());
    expect(screen.queryByText("Previously suggested")).not.toBeInTheDocument();
  });
});
