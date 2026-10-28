import { describe, expect, it } from "vitest";
import { limitLabel, windowLabel } from "./admin.settings.utils";

describe("admin settings utils", () => {
  it("labels limit keys, falling back to the key", () => {
    expect(limitLabel("loginIp")).toBe("Login attempts per IP");
    expect(limitLabel("mystery")).toBe("mystery");
  });

  it("formats windows", () => {
    expect(windowLabel(900)).toBe("15 min");
    expect(windowLabel(60)).toBe("min");
    expect(windowLabel(3600)).toBe("hour");
    expect(windowLabel(7200)).toBe("2 h");
    expect(windowLabel(86400)).toBe("day");
    expect(windowLabel(45)).toBe("45 s");
  });
});
