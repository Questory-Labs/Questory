import { describe, expect, it, vi } from "vitest";
import {
  createGlyphPainter,
  createLinkPainter,
  createMorphPainter,
  createRingPainter,
  DOT_TINTS,
  morphIndexAt,
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

  it("paints dots for each painter", () => {
    const link = mockCtx(640, 320);
    createLinkPainter("ok")(link, 1);
    expect(link.fillRect).toHaveBeenCalled();

    const ring = mockCtx(576, 252);
    createRingPainter()(ring, 1);
    expect(ring.fillRect).toHaveBeenCalled();
    expect(DOT_TINTS.danger).toMatch(/^\d+,\d+,\d+$/);
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
