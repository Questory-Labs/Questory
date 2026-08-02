import { describe, expect, it } from "vitest";
import {
  generateCardTheme,
  getDomainIdentity,
  resolveVariantIndex,
  type RewindDomain,
} from "./rewind-card-engine";

const DOMAINS: RewindDomain[] = ["music", "watch", "read"];

describe("rewind-card-engine", () => {
  it("returns a distinct identity per domain", () => {
    const labels = DOMAINS.map((d) => getDomainIdentity(d).label);
    expect(new Set(labels).size).toBe(3);
    for (const domain of DOMAINS) {
      const identity = getDomainIdentity(domain);
      expect(identity.domain).toBe(domain);
      expect(identity.palette.accent).toMatch(/^#/);
      expect(identity.patternPool.length).toBeGreaterThan(0);
    }
  });

  it("generates stable themes for the same inputs", () => {
    for (const domain of DOMAINS) {
      const a = generateCardTheme(domain, 2, "peaktime");
      const b = generateCardTheme(domain, 2, "peaktime");
      expect(a).toEqual(b);
    }
  });

  it("cycles variants by card index", () => {
    for (const domain of DOMAINS) {
      const themes = [0, 1, 2, 3].map((i) => generateCardTheme(domain, i));
      expect(themes[0]).toEqual(themes[3]);
      expect(themes[0].container).not.toBe(themes[1].container);
    }
  });

  it("maps known tags to preferred variants", () => {
    expect(resolveVariantIndex("music", 99, "topgenre")).toBe(0);
    expect(resolveVariantIndex("watch", 99, "peaktime")).toBe(2);
    expect(resolveVariantIndex("read", 99, "pageturner")).toBe(2);
  });

  it("every theme has required style fields", () => {
    for (const domain of DOMAINS) {
      for (let i = 0; i < 3; i++) {
        const theme = generateCardTheme(domain, i);
        expect(theme.container.length).toBeGreaterThan(0);
        expect(theme.title.length).toBeGreaterThan(0);
        expect(theme.text.length).toBeGreaterThan(0);
        expect(theme.highlight.length).toBeGreaterThan(0);
        expect(theme.pattern.kind).toBeTruthy();
      }
    }
  });
});
