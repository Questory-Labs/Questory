import { describe, expect, it } from "vitest";
import { featureErrorMessage, sourceEnabled } from "./app-status";

describe("sourceEnabled", () => {
  it("defaults to on when sources are missing", () => {
    expect(sourceEnabled(undefined, "trakt")).toBe(true);
  });
});

describe("featureErrorMessage", () => {
  it("surfaces a 403 disabled message", () => {
    const err = Object.assign(new Error("Music is disabled on this instance"), {
      status: 403,
    });
    expect(featureErrorMessage(err, "Could not load music analytics.")).toBe(
      "Music is disabled on this instance",
    );
  });

  it("keeps the fallback for other errors", () => {
    expect(featureErrorMessage(new Error("boom"), "Could not load")).toBe(
      "Could not load",
    );
  });
});
