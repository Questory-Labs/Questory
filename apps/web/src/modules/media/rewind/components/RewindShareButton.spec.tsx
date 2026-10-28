import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { drawShareCard, RewindShareButton } from "./RewindShareButton";

describe("RewindShareButton", () => {
  afterEach(cleanup);

  it("is disabled without tiles", () => {
    render(<RewindShareButton title="My Rewind" fileName="r.png" tiles={[]} />);
    expect(screen.getByRole("button", { name: "Download share card" })).toBeDisabled();
  });

  it("draws the title and each tile", () => {
    const fillText = vi.fn();
    const ctx = { fillRect: vi.fn(), fillText, fillStyle: "", font: "" };
    const canvas = { getContext: () => ctx, width: 0, height: 0 } as unknown as HTMLCanvasElement;
    expect(
      drawShareCard(canvas, "My September 2026 Rewind", [
        { key: "a", label: "Games", value: "46h", note: "18 games" },
      ]),
    ).toBe(true);
    const texts = fillText.mock.calls.map((c) => c[0]);
    expect(texts).toEqual(expect.arrayContaining(["My September 2026 Rewind", "GAMES", "46h", "18 games"]));
  });
});
