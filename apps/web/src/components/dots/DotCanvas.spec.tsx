import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { DotCanvas, prefersReducedMotion } from "./DotCanvas";

describe("DotCanvas", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("is decorative without a label", () => {
    const { container } = render(
      <DotCanvas paint={vi.fn()} width={10} height={10} />,
    );
    expect(container.querySelector("canvas")).toHaveAttribute("aria-hidden", "true");
  });

  it("exposes an image role with a label", () => {
    const { getByRole } = render(
      <DotCanvas paint={vi.fn()} width={10} height={10} label="404" />,
    );
    expect(getByRole("img", { name: "404" })).toHaveAttribute("width", "10");
  });

  it("paints once at the static time under reduced motion", () => {
    const ctx = {} as CanvasRenderingContext2D;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      ctx as unknown as ReturnType<HTMLCanvasElement["getContext"]>,
    );
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true })),
    );
    const paint = vi.fn();
    render(<DotCanvas paint={paint} width={10} height={10} staticTime={2} />);
    expect(prefersReducedMotion()).toBe(true);
    expect(paint).toHaveBeenCalledOnce();
    expect(paint).toHaveBeenCalledWith(ctx, 2);
    vi.unstubAllGlobals();
  });
});
