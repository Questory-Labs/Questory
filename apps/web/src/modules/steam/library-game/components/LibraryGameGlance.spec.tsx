import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LibraryGameGlance } from "./LibraryGameGlance";

describe("LibraryGameGlance", () => {
  it("renders nothing without tiles", () => {
    const { container } = render(<LibraryGameGlance tiles={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders labeled stats", () => {
    render(
      <LibraryGameGlance
        tiles={[
          { label: "HowLongToBeat", value: "40%", hint: "4h of 10h main story" },
          { label: "Store price", value: "$10.00", hint: "At historical low" },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { name: "At a glance" })).toBeInTheDocument();
    expect(screen.getByText("HowLongToBeat")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
  });
});
