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
    const dialog = screen.getByRole("dialog", { name: "Wide" });
    expect(dialog.closest(".hatch-shadow")).toHaveClass("max-w-xl");
  });

  it("uses a hatch overlay instead of glass blur", () => {
    render(
      <Dialog open onClose={() => undefined} title="Confirm">
        Body
      </Dialog>,
    );
    const close = screen.getByRole("button", { name: "Close dialog" });
    expect(close.className).not.toContain("backdrop-blur");
    expect(close.className).toContain("hatch-fill");
    expect(screen.getByRole("dialog").closest(".hatch-shadow")).toBeTruthy();
  });

  it("uses an opaque dialog face, not the translucent panel wash", () => {
    render(
      <Dialog open onClose={() => undefined} title="Confirm">
        Body
      </Dialog>,
    );
    const face = screen.getByRole("dialog").closest(".hatch-face");
    expect(face).toHaveClass("dialog-face");
    expect(face).not.toHaveClass("panel");
  });
});
