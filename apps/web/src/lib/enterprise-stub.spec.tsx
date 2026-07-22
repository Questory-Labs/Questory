import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import {
  RecommendationsPanel,
  RecommendationsWidget,
} from "./enterprise-stub";

/** The community stub must render nothing and never throw. */
describe("enterprise-stub", () => {
  it("renders null for all exported components", () => {
    const panel = render(<RecommendationsPanel />);
    expect(panel.container.innerHTML).toBe("");

    const widget = render(<RecommendationsWidget limit={3} />);
    expect(widget.container.innerHTML).toBe("");
  });
});
