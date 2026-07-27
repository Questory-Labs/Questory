import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

describe("React text escaping", () => {
  it("renders script-looking collection names as text", () => {
    const name = "<script>alert(1)</script>";
    render(<div data-testid="name">{name}</div>);
    expect(screen.getByTestId("name").textContent).toBe(name);
    expect(screen.getByTestId("name").innerHTML).not.toContain("<script>");
  });
});
