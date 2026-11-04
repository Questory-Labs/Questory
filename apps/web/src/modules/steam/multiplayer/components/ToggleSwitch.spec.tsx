import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ToggleSwitch } from "./ToggleSwitch";

describe("ToggleSwitch", () => {
  afterEach(cleanup);

  it("reports the next state", () => {
    const onChange = vi.fn();
    render(<ToggleSwitch label="Suggested" checked onChange={onChange} />);
    const sw = screen.getByRole("switch", { name: "Suggested" });
    expect(sw).toHaveAttribute("aria-checked", "true");
    fireEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(false);
  });
});
