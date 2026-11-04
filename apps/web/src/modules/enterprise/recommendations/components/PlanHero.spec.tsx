import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { RecommendationItem } from "@/lib/enterprise-types";
import { PlanHero } from "./PlanHero";

const items: RecommendationItem[] = [
  { kind: "game", domain: "games", name: "A Short Hike", score: 0.9, reasons: [] },
];

describe("PlanHero", () => {
  afterEach(cleanup);

  it("renders the plan steps with linked items and re-curates", () => {
    const onRecurate = vi.fn();
    render(
      <PlanHero
        plan={{ title: "One short game", steps: [{ itemIndex: 0, note: "Start with" }, { note: "Wind down" }] }}
        items={items}
        onRecurate={onRecurate}
      />,
    );
    expect(screen.getByRole("heading", { name: "One short game" })).toBeInTheDocument();
    expect(screen.getByText("— A Short Hike")).toBeInTheDocument();
    expect(screen.getByText("Wind down")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Re-curate/ }));
    expect(onRecurate).toHaveBeenCalled();
  });

  it("renders nothing for an empty plan", () => {
    const { container } = render(<PlanHero plan={{ title: "Empty", steps: [] }} items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
