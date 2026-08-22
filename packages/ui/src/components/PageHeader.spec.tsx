import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("renders eyebrow, title, and actions", () => {
    render(
      <PageHeader
        eyebrow="Library"
        title="Games"
        description="Your shelf."
        actions={<button type="button">Refresh</button>}
      />,
    );
    expect(screen.getByText("Library")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Games" })).toBeInTheDocument();
    expect(screen.getByText("Your shelf.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
  });
});
