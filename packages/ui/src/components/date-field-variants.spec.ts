import { describe, expect, it } from "vitest";
import {
  dateFieldDayVariants,
  dateFieldTriggerVariants,
} from "./date-field-variants";

describe("date-field-variants", () => {
  it("marks the trigger as open", () => {
    expect(dateFieldTriggerVariants({ open: true })).toContain(
      "border-[var(--line-strong)]",
    );
    expect(dateFieldTriggerVariants({ open: false })).toContain(
      "border-[var(--line)]",
    );
  });

  it("selects a calendar day state", () => {
    expect(dateFieldDayVariants({ state: "selected" })).toContain(
      "bg-[var(--accent)]",
    );
    expect(dateFieldDayVariants({ state: "today" })).toContain("ring-inset");
  });
});
