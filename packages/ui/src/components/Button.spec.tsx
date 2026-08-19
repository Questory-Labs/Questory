import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button, buttonVariants } from "./Button";

describe("Button", () => {
  it("renders a primary button by default", () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveClass("btn", "btn-primary");
    expect(button).toHaveAttribute("type", "button");
  });

  it("applies the danger variant", () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass(
      "btn-danger",
    );
  });

  it("applies size recipes", () => {
    render(
      <Button size="sm" variant="secondary">
        Compact
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Compact" })).toHaveClass(
      "btn-sm",
      "btn-secondary",
    );
    expect(buttonVariants({ variant: "ghost", size: "lg" })).toContain("btn-lg");
    expect(buttonVariants({ variant: "ghost", size: "lg" })).toContain(
      "btn-ghost",
    );
  });
});
