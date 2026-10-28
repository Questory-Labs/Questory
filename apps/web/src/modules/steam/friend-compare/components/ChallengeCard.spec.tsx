import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ChallengeCard } from "./ChallengeCard";

describe("ChallengeCard", () => {
  afterEach(cleanup);

  it("lists challenge games", () => {
    render(
      <ChallengeCard
        games={[{ appId: 1, name: "Portal", headerImage: "https://x/p.jpg" }]}
      />,
    );
    expect(screen.getByText("Portal")).toBeInTheDocument();
  });

  it("shows an empty message", () => {
    render(<ChallengeCard games={[]} />);
    expect(screen.getByText("No unplayed games in common.")).toBeInTheDocument();
  });
});
