import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { Friend } from "@questorylabs/shared";
import { useFamilyImportSelection } from "./steam.family.hooks";

const friends: Friend[] = [
  { steamId: "1", personaName: "Alice", avatarUrl: null },
  { steamId: "2", personaName: "Bob", avatarUrl: null },
  { steamId: "3", personaName: "Carol", avatarUrl: null },
];

describe("useFamilyImportSelection", () => {
  it("excludes existing members from importable friends", () => {
    const { result } = renderHook(() =>
      useFamilyImportSelection(friends, new Set(["2"])),
    );
    expect(result.current.importable.map((f) => f.steamId)).toEqual([
      "1",
      "3",
    ]);
  });

  it("filters importable friends by name or steam id", () => {
    const { result } = renderHook(() =>
      useFamilyImportSelection(friends, new Set()),
    );
    act(() => {
      result.current.setFilter("bob");
    });
    expect(result.current.importable).toHaveLength(1);
    expect(result.current.importable[0]?.personaName).toBe("Bob");
  });

  it("toggles a friend in and out of the selected set", () => {
    const { result } = renderHook(() =>
      useFamilyImportSelection(friends, new Set()),
    );
    act(() => {
      result.current.toggle("1");
    });
    expect(result.current.selected.has("1")).toBe(true);
    act(() => {
      result.current.toggle("1");
    });
    expect(result.current.selected.has("1")).toBe(false);
  });

  it("toggleAll selects and deselects visible friends", () => {
    const { result } = renderHook(() =>
      useFamilyImportSelection(friends, new Set()),
    );
    act(() => {
      result.current.toggleAll();
    });
    expect(result.current.selected.size).toBe(3);
    act(() => {
      result.current.toggleAll();
    });
    expect(result.current.selected.size).toBe(0);
  });

  it("does not select more friends than remaining slots", () => {
    const { result } = renderHook(() =>
      useFamilyImportSelection(friends, new Set(), 1),
    );
    act(() => {
      result.current.toggle("1");
      result.current.toggle("2");
    });
    expect([...result.current.selected]).toEqual(["1"]);
  });

  it("toggleAll only fills remaining slots", () => {
    const { result } = renderHook(() =>
      useFamilyImportSelection(friends, new Set(), 2),
    );
    act(() => {
      result.current.toggleAll();
    });
    expect(result.current.selected.size).toBe(2);
  });

  it("drops selected friends who are already family members", () => {
    const { result, rerender } = renderHook(
      ({ memberIds }: { memberIds: Set<string> }) =>
        useFamilyImportSelection(friends, memberIds, 5),
      { initialProps: { memberIds: new Set<string>() } },
    );
    act(() => {
      result.current.toggle("2");
    });
    expect(result.current.selected.has("2")).toBe(true);
    rerender({ memberIds: new Set(["2"]) });
    expect(result.current.selected.has("2")).toBe(false);
    expect(result.current.importable.map((f) => f.steamId)).toEqual([
      "1",
      "3",
    ]);
  });

  it("treats padded steam ids as already in the family", () => {
    const padded: Friend[] = [
      { steamId: " 2 ", personaName: "Bob", avatarUrl: null },
      { steamId: "3", personaName: "Carol", avatarUrl: null },
    ];
    const { result } = renderHook(() =>
      useFamilyImportSelection(padded, new Set(["2"])),
    );
    expect(result.current.importable.map((f) => f.steamId)).toEqual(["3"]);
  });

  it("reset clears the selected set and filter", () => {
    const { result } = renderHook(() =>
      useFamilyImportSelection(friends, new Set()),
    );
    act(() => {
      result.current.setFilter("a");
      result.current.toggle("1");
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.filter).toBe("");
    expect(result.current.selected.size).toBe(0);
  });
});
