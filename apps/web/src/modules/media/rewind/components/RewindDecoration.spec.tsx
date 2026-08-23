import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { DECORATION_KINDS } from "../media.rewind.types";
import { RewindDecoration } from "./RewindDecoration";

describe("RewindDecoration", () => {
  afterEach(cleanup);

  it("mounts a distinct node for every visible decoration", () => {
    for (const kind of DECORATION_KINDS) {
      const { container } = render(<RewindDecoration kind={kind} />);
      if (kind === "none") {
        expect(container.querySelector("[data-rewind-decoration]")).toBeNull();
      } else {
        expect(container.querySelector(`[data-rewind-decoration="${kind}"]`)).toBeTruthy();
      }
      cleanup();
    }
  });
});
