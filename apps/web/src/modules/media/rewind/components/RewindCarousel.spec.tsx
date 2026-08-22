import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { RewindCarousel } from "./RewindCarousel";
import { REWIND_CAROUSEL_AUTOPLAY_MS } from "../media.rewind.constants";

function slides(...labels: string[]) {
  return (
    <RewindCarousel>
      {labels.map((label) => (
        <div key={label}>{label}</div>
      ))}
    </RewindCarousel>
  );
}

describe("RewindCarousel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders a dot per slide and next/prev change the visible card", () => {
    render(slides("Alpha", "Beta", "Gamma"));

    expect(screen.getByLabelText("Go to insight 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Go to insight 2")).toBeInTheDocument();
    expect(screen.getByLabelText("Go to insight 3")).toBeInTheDocument();
    expect(screen.getByText("Insight 1 of 3")).toBeInTheDocument();
    expect(screen.getByLabelText("Go to insight 1")).toHaveAttribute("aria-current", "true");

    fireEvent.click(screen.getByRole("button", { name: "Next insight" }));
    expect(screen.getByText("Insight 2 of 3")).toBeInTheDocument();
    expect(screen.getByLabelText("Go to insight 2")).toHaveAttribute("aria-current", "true");

    fireEvent.click(screen.getByRole("button", { name: "Previous insight" }));
    expect(screen.getByText("Insight 1 of 3")).toBeInTheDocument();
  });

  it("jumps to a dot and wraps arrows at the ends", () => {
    render(slides("Alpha", "Beta", "Gamma"));

    fireEvent.click(screen.getByLabelText("Go to insight 3"));
    expect(screen.getByText("Insight 3 of 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next insight" }));
    expect(screen.getByText("Insight 1 of 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous insight" }));
    expect(screen.getByText("Insight 3 of 3")).toBeInTheDocument();
  });

  it("autoplays to the next slide and pauses while hovered", () => {
    render(slides("Alpha", "Beta", "Gamma"));

    act(() => {
      vi.advanceTimersByTime(REWIND_CAROUSEL_AUTOPLAY_MS);
    });
    expect(screen.getByText("Insight 2 of 3")).toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByRole("region", { name: "AI insights" }));
    act(() => {
      vi.advanceTimersByTime(REWIND_CAROUSEL_AUTOPLAY_MS * 2);
    });
    expect(screen.getByText("Insight 2 of 3")).toBeInTheDocument();

    fireEvent.mouseLeave(screen.getByRole("region", { name: "AI insights" }));
    act(() => {
      vi.advanceTimersByTime(REWIND_CAROUSEL_AUTOPLAY_MS);
    });
    expect(screen.getByText("Insight 3 of 3")).toBeInTheDocument();
  });

  it("shows prev and next slides behind the current card", () => {
    render(slides("Alpha", "Beta", "Gamma"));

    expect(document.querySelector('[data-slot="prev"]')).toHaveTextContent("Gamma");
    expect(document.querySelector('[data-slot="current"]')).toHaveTextContent("Alpha");
    expect(document.querySelector('[data-slot="next"]')).toHaveTextContent("Beta");

    fireEvent.click(document.querySelector('[data-slot="next"]') as HTMLElement);
    expect(screen.getByText("Insight 2 of 3")).toBeInTheDocument();
    expect(document.querySelector('[data-slot="current"]')).toHaveTextContent("Beta");
  });

  it("hides arrows and dots and does not autoplay for a single slide", () => {
    const spy = vi.spyOn(window, "setInterval");
    render(slides("Only"));

    expect(screen.getByText("Only")).toBeInTheDocument();
    expect(document.querySelector('[data-slot="prev"]')).toBeNull();
    expect(document.querySelector('[data-slot="next"]')).toBeNull();
    expect(screen.queryByRole("button", { name: "Previous insight" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Next insight" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Go to insight/ })).toBeNull();
    expect(
      spy.mock.calls.some(([, ms]) => ms === REWIND_CAROUSEL_AUTOPLAY_MS),
    ).toBe(false);

    act(() => {
      vi.advanceTimersByTime(REWIND_CAROUSEL_AUTOPLAY_MS * 2);
    });
    expect(screen.getByText("Only")).toBeInTheDocument();
    expect(screen.getByText("Insight 1 of 1")).toBeInTheDocument();
  });
});
