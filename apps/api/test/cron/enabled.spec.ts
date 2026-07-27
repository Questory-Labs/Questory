import { afterEach, describe, expect, it } from "vitest";
import { isCronEnabled } from "../../src/cron/cron-enabled";

describe("isCronEnabled", () => {
  const prev = process.env.CRON_ENABLED;

  afterEach(() => {
    if (prev === undefined) {
      delete process.env.CRON_ENABLED;
    } else {
      process.env.CRON_ENABLED = prev;
    }
  });

  it("defaults to enabled when unset", () => {
    delete process.env.CRON_ENABLED;
    expect(isCronEnabled()).toBe(true);
  });

  it("defaults to enabled when empty", () => {
    process.env.CRON_ENABLED = "  ";
    expect(isCronEnabled()).toBe(true);
  });

  it("treats truthy-ish values as enabled", () => {
    process.env.CRON_ENABLED = "true";
    expect(isCronEnabled()).toBe(true);
    process.env.CRON_ENABLED = "1";
    expect(isCronEnabled()).toBe(true);
    process.env.CRON_ENABLED = "yes";
    expect(isCronEnabled()).toBe(true);
  });

  it("opts out on false / FALSE / 0", () => {
    process.env.CRON_ENABLED = "false";
    expect(isCronEnabled()).toBe(false);
    process.env.CRON_ENABLED = "FALSE";
    expect(isCronEnabled()).toBe(false);
    process.env.CRON_ENABLED = "0";
    expect(isCronEnabled()).toBe(false);
  });
});
