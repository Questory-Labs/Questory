import { describe, expect, it } from "vitest";
import { sanitizeAppHref } from "@questorylabs/shared";

describe("notification href policy", () => {
  it("blocks javascript and protocol-relative URLs", () => {
    expect(sanitizeAppHref("javascript:alert(1)")).toBeNull();
    expect(sanitizeAppHref("//evil.test/x")).toBeNull();
    expect(sanitizeAppHref("https://evil.test")).toBeNull();
  });

  it("allows in-app paths", () => {
    expect(sanitizeAppHref("/library")).toBe("/library");
  });
});
