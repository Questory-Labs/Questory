import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { RewindInsightResponse } from "@questorylabs/shared";
import { mockResource } from "@/test/resource-mock";
import { RewindAiPanel } from "./RewindAiPanel";

const ai = (content: string) =>
  mockResource<RewindInsightResponse>({
    empty: false,
    failed: false,
    value: { period: "2026-09", content, generatedAt: "2026-10-01T00:00:00.000Z", cached: true },
  });

describe("RewindAiPanel", () => {
  afterEach(cleanup);

  it("cycles cards with prev, next and dots", () => {
    render(
      <RewindAiPanel
        aiQuery={ai("<vibecheck>One.</vibecheck>\n<crossover>Two.</crossover>")}
        domain="music"
        blockedMessage={null}
        onRegenerate={() => undefined}
        regenerateDisabled={false}
      />,
    );
    expect(screen.getByText("One.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous insight" }));
    expect(screen.getByText("Two.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Go to insight 1" }));
    expect(screen.getByText("One.")).toBeInTheDocument();
  });

  it("shows the blocked message and calls regenerate", () => {
    const onRegenerate = vi.fn();
    render(
      <RewindAiPanel
        aiQuery={ai("<vibecheck>One.</vibecheck>")}
        domain="music"
        blockedMessage="Not yet."
        onRegenerate={onRegenerate}
        regenerateDisabled={false}
      />,
    );
    expect(screen.getByText("Not yet.")).toBeInTheDocument();
    expect(screen.queryByText("One.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));
    expect(onRegenerate).toHaveBeenCalledOnce();
  });

  it("shows the error before the empty state", () => {
    render(
      <RewindAiPanel
        aiQuery={mockResource<RewindInsightResponse>({ empty: true, failed: true })}
        domain="music"
        blockedMessage={null}
        onRegenerate={() => undefined}
        regenerateDisabled
      />,
    );
    expect(screen.getByText("fail")).toBeInTheDocument();
    expect(screen.queryByText("Synthesizing insights...")).toBeNull();
  });
});
