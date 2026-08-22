import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("btn", false, "btn-primary", undefined, "")).toBe(
      "btn btn-primary",
    );
  });

  it("merges conflicting Tailwind utilities", () => {
    expect(cn("max-w-md px-2", "max-w-xl px-4")).toBe("max-w-xl px-4");
  });
});
