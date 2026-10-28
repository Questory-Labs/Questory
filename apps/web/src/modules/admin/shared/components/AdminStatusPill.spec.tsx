import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminStat } from "./AdminStat";
import { AdminStatusPill } from "./AdminStatusPill";

describe("AdminStatusPill", () => {
  it("renders label with tone colour", () => {
    render(<AdminStatusPill tone="danger">Failed</AdminStatusPill>);
    expect(screen.getByText("Failed").className).toContain("var(--danger)");
  });
});

describe("AdminStat", () => {
  it("renders label and text value", () => {
    render(<AdminStat label="Signup" value="Closed" />);
    expect(screen.getByText("Signup")).toBeTruthy();
    expect(screen.getByText("Closed")).toBeTruthy();
  });

  it("renders numeric value accessibly", () => {
    render(<AdminStat label="Users" value={24} />);
    expect(screen.getAllByText("24").length).toBeGreaterThan(0);
  });
});
