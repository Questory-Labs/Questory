import { describe, expect, it } from "vitest";
import {
  bangumiCollectionTypeName,
  mapBangumiCollectionType,
} from "../../src/read/bangumi/bangumi-map";

describe("bangumiCollectionTypeName", () => {
  it.each([
    [1, "wish", "planning"],
    [2, "collect", "completed"],
    [3, "do", "reading"],
    [4, "on_hold", "paused"],
    [5, "dropped", "dropped"],
  ])("maps integer %i to %s and list status %s", (type, name, listStatus) => {
    expect(bangumiCollectionTypeName(type)).toBe(name);
    expect(mapBangumiCollectionType(name)).toBe(listStatus);
  });

  it.each([[0], [6], [-1], [1.5], ["1"], ["do"], ["constructor"], [null], [undefined]])(
    "returns null for %j",
    (type) => {
      expect(bangumiCollectionTypeName(type)).toBeNull();
    },
  );
});
