import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FlagToggle, originCaption } from "./FlagToggle";

describe("FlagToggle", () => {
  it("labels origin and pressed state", () => {
    expect(originCaption("db")).toBe("Saved in Admin");
    expect(originCaption("env")).toBe("From environment");
    expect(originCaption("default")).toBe("Default");
    render(
      <FlagToggle
        label="Music"
        hint="Listening analytics"
        origin="env"
        enabled
        busy={false}
        onToggle={() => undefined}
      />,
    );
    expect(screen.getByRole("button", { name: "On" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
