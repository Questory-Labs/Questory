import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MoodBar } from "./MoodBar";

vi.mock("@/lib/enterprise-api", () => ({
  peekCurateCache: vi.fn(async () => ({ cached: false })),
}));

import { peekCurateCache } from "@/lib/enterprise-api";

const peek = vi.mocked(peekCurateCache);

describe("MoodBar", () => {
  beforeEach(() => {
    peek.mockReset();
    peek.mockResolvedValue({ cached: false });
  });
  afterEach(cleanup);

  it("submits the typed mood as a normal curate when uncached", async () => {
    const onCurate = vi.fn();
    const onUseCached = vi.fn();
    render(
      <MoodBar busy={false} onCurate={onCurate} onUseCached={onUseCached} />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Mood" }), {
      target: { value: "  I have 45 minutes and want something cozy  " },
    });
    await waitFor(() => expect(peek).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Curate" }));

    expect(onCurate).toHaveBeenCalledWith(
      "I have 45 minutes and want something cozy",
      { force: false },
    );
    expect(onUseCached).not.toHaveBeenCalled();
  });

  it("submits undefined for an empty mood (plain curation)", async () => {
    const onCurate = vi.fn();
    render(
      <MoodBar busy={false} onCurate={onCurate} onUseCached={vi.fn()} />,
    );
    await waitFor(() => expect(peek).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Curate" }));
    expect(onCurate).toHaveBeenCalledWith(undefined, { force: false });
  });

  it("Curate loads cache when a hit is available", async () => {
    peek.mockResolvedValue({ cached: true });
    const onCurate = vi.fn();
    const onUseCached = vi.fn();
    render(
      <MoodBar busy={false} onCurate={onCurate} onUseCached={onUseCached} />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Mood" }), {
      target: { value: "Cozy evening" },
    });

    await waitFor(() =>
      expect(peek).toHaveBeenCalledWith(
        expect.objectContaining({ mood: "Cozy evening" }),
      ),
    );
    // Wait until the peek result has flipped cacheAvailable (no dual buttons).
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Curate" })).toHaveAttribute(
        "data-cache",
        "true",
      );
    });
    expect(screen.queryByRole("button", { name: "Use cached" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Force Curate" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Curate" }));
    expect(onUseCached).toHaveBeenCalledWith("Cozy evening");
    expect(onCurate).not.toHaveBeenCalled();
  });

  it("chips fill the input without submitting", async () => {
    const onCurate = vi.fn();
    const onUseCached = vi.fn();
    render(
      <MoodBar busy={false} onCurate={onCurate} onUseCached={onUseCached} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Surprise me" }));
    expect(screen.getByRole("textbox", { name: "Mood" })).toHaveValue(
      "Surprise me",
    );
    await waitFor(() => expect(peek).toHaveBeenCalled());
    expect(onCurate).not.toHaveBeenCalled();
    expect(onUseCached).not.toHaveBeenCalled();
  });

  it("disables everything while a job runs", () => {
    render(
      <MoodBar busy onCurate={vi.fn()} onUseCached={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Curating…" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Mood" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cozy evening" })).toBeDisabled();
  });
});
