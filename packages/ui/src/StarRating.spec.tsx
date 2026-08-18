import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StarRating } from "./StarRating";

describe("StarRating", () => {
  afterEach(() => {
    cleanup();
  });
  it("selects a half star", () => {
    const onChange = vi.fn();
    render(<StarRating value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "3.5 stars" }));
    expect(onChange).toHaveBeenCalledWith(3.5);
  });

  it("clears when the same value is clicked again", () => {
    const onChange = vi.fn();
    render(<StarRating value={4} onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "4 stars" }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("shows the committed value and previews on hover", () => {
    const onChange = vi.fn();
    render(<StarRating value={2} onChange={onChange} />);
    expect(screen.getByTestId("star-rating-value")).toHaveTextContent("2 / 5");
    fireEvent.mouseEnter(screen.getByRole("radio", { name: "3.5 stars" }));
    expect(screen.getByTestId("star-rating-value")).toHaveTextContent("3.5 / 5");
    fireEvent.mouseLeave(screen.getByRole("radiogroup", { name: "Rating" }));
    expect(screen.getByTestId("star-rating-value")).toHaveTextContent("2 / 5");
  });

  it("clears from the Clear control", () => {
    const onChange = vi.fn();
    render(<StarRating value={2.5} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
