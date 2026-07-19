import { describe, expect, it } from "vitest";
import { sanitizeAppHref } from "./safe-href";

describe("sanitizeAppHref", () => {
  it("allows same-origin paths", () => {
    expect(sanitizeAppHref("/library")).toBe("/library");
    expect(sanitizeAppHref("/collections/abc")).toBe("/collections/abc");
  });

  it("blocks javascript and external urls", () => {
    expect(sanitizeAppHref("javascript:alert(1)")).toBeNull();
    expect(sanitizeAppHref("https://evil.example")).toBeNull();
    expect(sanitizeAppHref("//evil.example")).toBeNull();
    expect(sanitizeAppHref("data:text/html,hi")).toBeNull();
  });
});
