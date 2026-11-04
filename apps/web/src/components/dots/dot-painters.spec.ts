import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createGlyphPainter,
  createLinkPainter,
  createMorphPainter,
  createRingPainter,
  DOT_TINTS,
  morphIndexAt,
  morphLabelIndexAt,
  MORPH_PERIOD_SEC,
  seededRandom,
} from "./dot-painters";

const mockCtx = (width: number, height: number) => {
  const ctx = {
    canvas: { width, height },
    fillStyle: "",
    textAlign: "",
    textBaseline: "",
    font: "",
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    fillText: vi.fn(),
    getImageData: vi.fn((_x: number, _y: number, w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4).fill(255),
    })),
  };
  const fallback = () => ({ addColorStop: vi.fn() });
  const proxied = new Proxy(ctx as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : (t[k] = vi.fn(fallback))),
  });
  return proxied as unknown as CanvasRenderingContext2D & {
    fillRect: ReturnType<typeof vi.fn>;
  };
};

describe("dot-painters", () => {
  it("seeds deterministic noise", () => {
    expect(Array.from(seededRandom(5, 7))).toEqual(Array.from(seededRandom(5, 7)));
    expect(Array.from(seededRandom(5, 7))).not.toEqual(Array.from(seededRandom(5, 8)));
  });

  it("cycles the morph index per period", () => {
    expect(morphIndexAt(0)).toBe(0);
    expect(morphIndexAt(MORPH_PERIOD_SEC + 0.01)).toBe(1);
    expect(morphIndexAt(MORPH_PERIOD_SEC * 4 + 0.01)).toBe(0);
  });

  it("flips the morph label at the visual midpoint of each morph", () => {
    expect(morphLabelIndexAt(0)).toBe(0);
    expect(morphLabelIndexAt(MORPH_PERIOD_SEC * 0.8)).toBe(0);
    expect(morphLabelIndexAt(MORPH_PERIOD_SEC * 0.82)).toBe(1);
    expect(morphLabelIndexAt(MORPH_PERIOD_SEC * 3.8)).toBe(3);
    expect(morphLabelIndexAt(MORPH_PERIOD_SEC * 3.82)).toBe(0);
  });

  it("paints dots for each painter", () => {
    const link = mockCtx(640, 320);
    createLinkPainter("ok")(link, 1);
    expect(link.fillRect).toHaveBeenCalled();

    const ring = mockCtx(576, 252);
    createRingPainter()(ring, 1);
    expect(ring.fillRect).toHaveBeenCalled();
    expect(DOT_TINTS.danger).toMatch(/^\d+,\d+,\d+$/);
  });

  it("draws status glyphs in a font with an unmarked zero", () => {
    const offscreen = mockCtx(96, 42);
    const original = document.createElement.bind(document);
    const spy = vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag !== "canvas") return original(tag);
      const c = original("canvas");
      Object.defineProperty(c, "getContext", { value: () => offscreen });
      return c;
    });
    createGlyphPainter("500", DOT_TINTS.danger)(mockCtx(576, 252), 1);
    expect(offscreen.font).toContain("UnifrakturCook");
    expect(offscreen.font).toContain("Outfit");
    expect(offscreen.font).not.toContain("Mono");
    spy.mockRestore();
  });

  it("assembles the status glyph on the first paint under a static time", () => {
    const original = document.createElement.bind(document);
    const spy = vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag !== "canvas") return original(tag);
      const c = original("canvas");
      Object.defineProperty(c, "getContext", { value: () => mockCtx(c.width, c.height) });
      return c;
    });
    const ctx = mockCtx(864, 378);
    createGlyphPainter("500", DOT_TINTS.danger)(ctx, 2);
    const horizontal = ctx.fillRect.mock.calls.filter((_, i) => i % 2 === 0);
    expect(horizontal.length).toBe(96 * 42);
    for (const [x, , w] of horizontal as number[][]) {
      expect(((x + w / 2 - 4.5) / 9) % 1).toBeCloseTo(0);
    }
    spy.mockRestore();
  });

  describe("status glyph font loading", () => {
    const stubCanvas = () => {
      const original = document.createElement.bind(document);
      return vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
        if (tag !== "canvas") return original(tag);
        const c = original("canvas");
        Object.defineProperty(c, "getContext", { value: () => mockCtx(96, 42) });
        return c;
      });
    };
    const canvasCount = (spy: ReturnType<typeof stubCanvas>) =>
      spy.mock.calls.filter(([tag]) => tag === "canvas").length;
    const stubFonts = (fonts: { check: () => boolean; load: () => Promise<unknown> }) =>
      Object.defineProperty(document, "fonts", { value: fonts, configurable: true });

    afterEach(() => {
      Reflect.deleteProperty(document, "fonts");
      vi.restoreAllMocks();
    });

    it("redraws the glyph once the font arrives and requests it only once", () => {
      const spy = stubCanvas();
      const check = vi.fn(() => false);
      const load = vi.fn(() => Promise.resolve([]));
      stubFonts({ check, load });
      const paint = createGlyphPainter("500", DOT_TINTS.danger);
      const ctx = mockCtx(576, 252);
      paint(ctx, 1);
      paint(ctx, 1.1);
      expect(load).toHaveBeenCalledTimes(1);
      expect(canvasCount(spy)).toBe(1);
      check.mockReturnValue(true);
      paint(ctx, 1.2);
      paint(ctx, 1.3);
      expect(canvasCount(spy)).toBe(2);
    });

    it("keeps the fallback glyph and stops polling when the font fails to load", async () => {
      const spy = stubCanvas();
      const check = vi.fn(() => false);
      stubFonts({ check, load: () => Promise.reject(new Error("offline")) });
      const paint = createGlyphPainter("500", DOT_TINTS.danger);
      const ctx = mockCtx(576, 252);
      paint(ctx, 1);
      await Promise.resolve();
      await Promise.resolve();
      const checks = check.mock.calls.length;
      paint(ctx, 1.1);
      expect(check.mock.calls.length).toBe(checks);
      expect(canvasCount(spy)).toBe(1);
    });
  });

  it("guards painters that need an offscreen canvas", () => {
    const original = document.createElement.bind(document);
    const spy = vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag !== "canvas") return original(tag);
      const c = original("canvas");
      Object.defineProperty(c, "getContext", { value: () => mockCtx(c.width, c.height) });
      return c;
    });
    const glyph = mockCtx(576, 252);
    createGlyphPainter("404", DOT_TINTS.warn)(glyph, 5);
    expect(glyph.fillRect).toHaveBeenCalled();
    const morph = mockCtx(600, 384);
    expect(() => createMorphPainter()(morph, 1)).not.toThrow();
    spy.mockRestore();
  });
});
