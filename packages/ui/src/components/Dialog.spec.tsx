import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dialog } from "./Dialog";

describe("Dialog", () => {
  afterEach(() => {
    cleanup();
  });
  it("renders nothing when closed", () => {
    render(
      <Dialog open={false} onClose={() => undefined} title="Confirm">
        Body
      </Dialog>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on Escape and the backdrop control", () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="Confirm">
        Body
      </Dialog>,
    );

    expect(screen.getByRole("dialog", { name: "Confirm" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("applies a size recipe to the dialog surface", () => {
    render(
      <Dialog open onClose={() => undefined} title="Wide" size="xl">
        Body
      </Dialog>,
    );
    expect(screen.getByRole("dialog", { name: "Wide" })).toHaveClass("max-w-xl");
  });
});
