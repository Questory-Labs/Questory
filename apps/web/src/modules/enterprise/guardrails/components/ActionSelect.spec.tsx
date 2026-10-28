import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ActionSelect } from "./ActionSelect";

describe("ActionSelect", () => {
  afterEach(cleanup);

  it("renders every guardrail action and marks the current one", () => {
    render(<ActionSelect label="Action" value="mask" onChange={() => undefined} />);
    expect(screen.getByRole("group", { name: "Action" })).toBeInTheDocument();
    for (const name of ["Allow", "Mask", "Rewrite", "Block"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Mask" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("emits the picked action", () => {
    const onChange = vi.fn();
    render(<ActionSelect label="Action" value="mask" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Block" }));
    expect(onChange).toHaveBeenCalledWith("block");
  });
});
