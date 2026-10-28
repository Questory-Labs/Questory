import { describe, expect, it } from "vitest";
import type { ReadRecentEvent } from "@questorylabs/shared";
import { readEventTitle } from "./read.history.utils";

const event = (chaptersRead: number | null, volumesRead: number | null) =>
  ({ title: { name: "Berserk" }, chaptersRead, volumesRead }) as unknown as ReadRecentEvent;

describe("readEventTitle", () => {
  it("prefers chapters, then volumes, then the bare title", () => {
    expect(readEventTitle(event(12, 2))).toBe("Berserk · Ch. 12");
    expect(readEventTitle(event(null, 2))).toBe("Berserk · Vol. 2");
    expect(readEventTitle(event(null, null))).toBe("Berserk");
  });
});
