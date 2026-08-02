import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { assertRewindAiPeriodAllowed } from "../../src/lib/rewind-period";

describe("assertRewindAiPeriodAllowed", () => {
  it("rejects yearly rewind for the current calendar year", () => {
    const year = new Date().getFullYear().toString();
    expect(() => assertRewindAiPeriodAllowed(year)).toThrow(BadRequestException);
  });

  it("allows monthly rewind for the current calendar year", () => {
    const year = new Date().getFullYear();
    expect(() => assertRewindAiPeriodAllowed(`${year}-01`)).not.toThrow();
  });
});
