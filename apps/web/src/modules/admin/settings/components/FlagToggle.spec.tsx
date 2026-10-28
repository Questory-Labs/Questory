import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FlagToggle, originCaption } from "./FlagToggle";

describe("FlagToggle", () => {
  afterEach(cleanup);

  it("labels origin and checked state", () => {
    expect(originCaption("db")).toBe("Saved in Admin");
    expect(originCaption("env")).toBe("From environment");
    expect(originCaption("default")).toBe("Default");
    const onToggle = vi.fn();
    render(
      <FlagToggle
        label="Music"
        hint="Listening analytics"
        origin="env"
        enabled
        busy={false}
        onToggle={onToggle}
      />,
    );
    const sw = screen.getByRole("switch", { name: "Music" });
    expect(sw).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("From environment")).toBeInTheDocument();
    fireEvent.click(sw);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("disables the switch while busy", () => {
    render(
      <FlagToggle label="Read" hint="h" enabled={false} busy onToggle={() => undefined} />,
    );
    expect(screen.getByRole("switch", { name: "Read" })).toBeDisabled();
  });
});
