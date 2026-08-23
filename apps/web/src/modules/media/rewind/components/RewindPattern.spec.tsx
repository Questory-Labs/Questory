import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { PATTERN_KINDS } from "../media.rewind.types";
import { RewindPattern } from "./RewindPattern";

describe("RewindPattern", () => {
  afterEach(cleanup);

  it("mounts a distinct node for every pattern kind", () => {
    for (const kind of PATTERN_KINDS) {
      const { container } = render(
        <RewindPattern spec={{ kind, color: "#ccff00", colorAlt: "#312e81", opacity: 0.4 }} />,
      );
      expect(container.querySelector(`[data-rewind-pattern="${kind}"]`)).toBeTruthy();
      cleanup();
    }
  });
});
