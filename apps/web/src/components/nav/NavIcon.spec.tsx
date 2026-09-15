import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { NavIcon } from "./NavIcon";
import type { NavIconName } from "./nav-config";

const NEW_ICONS: NavIconName[] = [
  "listening",
  "charts",
  "history",
  "rewind",
  "sources",
];

describe("NavIcon", () => {
  it("draws a glyph for each media section icon", () => {
    for (const name of NEW_ICONS) {
      const { container } = render(<NavIcon name={name} />);
      expect(container.querySelector("svg")?.innerHTML.trim().length).toBeGreaterThan(
        0,
      );
    }
  });
});
