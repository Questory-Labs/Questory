import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useWishlistEdit } from "./steam.wishlist.hooks";

describe("useWishlistEdit", () => {
  it("startEdit sets key and target", () => {
    const { result } = renderHook(() => useWishlistEdit());

    act(() => {
      result.current.startEdit("steam:440", "9.99");
    });

    expect(result.current.editing).toBe("steam:440");
    expect(result.current.target).toBe("9.99");
  });

  it("stopEdit clears key and target", () => {
    const { result } = renderHook(() => useWishlistEdit());

    act(() => {
      result.current.startEdit("steam:440", "9.99");
    });
    act(() => {
      result.current.stopEdit();
    });

    expect(result.current.editing).toBeNull();
    expect(result.current.target).toBe("");
  });
});
