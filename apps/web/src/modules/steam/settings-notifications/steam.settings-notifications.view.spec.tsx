import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { NotificationChannel } from "@questorylabs/shared";
import { NotificationChannelsSection } from "./steam.settings-notifications.view";
import type { NotificationChannelsState } from "./steam.settings-notifications.types";

const idle = {
  submit: vi.fn(),
  submitAsync: vi.fn(),
  reset: vi.fn(),
  busy: false,
  failed: false,
  succeeded: false,
  error: null,
  value: undefined,
  input: undefined,
};

const channel: NotificationChannel = {
  id: "c1",
  kind: "discord",
  label: "Team server",
  target: "discord.com/…/1234…6789",
  types: ["deal"],
  enabled: true,
  lastSentAt: null,
  lastError: "HTTP 404",
  verified: true,
  createdAt: "2026-11-01T00:00:00.000Z",
};

const makeState = (
  items: NotificationChannel[],
  availableKinds: NotificationChannel["kind"][] = ["discord", "ntfy"],
): NotificationChannelsState =>
  ({
    channels: {
      value: { items, availableKinds },
      empty: false,
      failed: false,
      busy: false,
      refreshing: false,
      ready: true,
      error: null,
      updatedAt: 0,
      reload: async () => undefined,
    },
    create: { ...idle },
    update: { ...idle },
    remove: { ...idle },
    test: { ...idle },
    testResult: null,
    resend: { ...idle },
    resendResult: null,
    error: null,
    clearError: vi.fn(),
  }) as unknown as NotificationChannelsState;

describe("NotificationChannelsSection", () => {
  afterEach(cleanup);

  it("shows an unverified email channel as awaiting confirmation with a resend button", () => {
    const state = makeState([
      { ...channel, id: "c9", kind: "email", label: null, lastError: null, verified: false },
    ]);
    const resendSubmit = vi.fn();
    state.resend = { ...state.resend, submit: resendSubmit } as typeof state.resend;
    render(<NotificationChannelsSection state={state} />);
    expect(screen.getByText(/Awaiting confirmation/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Send test/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Resend confirmation link/ }));
    expect(resendSubmit).toHaveBeenCalledWith("c9");
  });

  it("lists channels with redacted target, type summary and last error", () => {
    render(<NotificationChannelsSection state={makeState([channel])} />);
    expect(screen.getByText("discord.com/…/1234…6789")).toBeTruthy();
    expect(screen.getByText("Wishlist deals")).toBeTruthy();
    expect(screen.getByText(/Last error: HTTP 404/)).toBeTruthy();
  });

  it("confirms before removing and toggles enabled via PATCH", () => {
    const state = makeState([channel]);
    render(<NotificationChannelsSection state={state} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove Team server" }));
    expect(state.remove.submit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Remove channel" }));
    expect(state.remove.submit).toHaveBeenCalledWith("c1");
    fireEvent.click(screen.getByRole("switch", { name: "Disable Team server" }));
    expect(state.update.submit).toHaveBeenCalledWith({ id: "c1", patch: { enabled: false } });
  });

  it("only offers kinds the server can deliver", () => {
    render(<NotificationChannelsSection state={makeState([])} />);
    fireEvent.click(screen.getByRole("button", { name: "Add channel" }));
    const options = screen.getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["Discord", "ntfy"]);
  });
});
