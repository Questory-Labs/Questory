import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("@/lib/api", () => ({ api }));

import { NotificationVerifyView } from "./steam.notifications-verify.view";

describe("NotificationVerifyView", () => {
  afterEach(() => {
    cleanup();
    api.mockReset();
  });

  it("does not verify until the user presses Confirm", async () => {
    api.mockResolvedValue({ ok: true });
    render(<NotificationVerifyView token="tok_abcdefghijklmnopqrstuvwxyz" />);
    expect(api).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByText(/Confirmed\./)).toBeTruthy();
    expect(api).toHaveBeenCalledWith("/notifications/verify", {
      method: "POST",
      body: JSON.stringify({ token: "tok_abcdefghijklmnopqrstuvwxyz" }),
    });
  });

  it("shows an error for an invalid or expired link", async () => {
    api.mockRejectedValue(new Error("This link is invalid or has expired"));
    render(<NotificationVerifyView token="bad" />);
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
  });
});
