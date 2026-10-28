import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const sync = vi.fn();
const state = {
  sync,
  busy: false,
  queued: false,
  error: null as string | null,
  retryIn: 0,
  disabled: false,
};
let active = false;

vi.mock("./useUserSync", () => ({ useUserSync: () => state }));
vi.mock("@/hooks/useSyncJobs", () => ({ useSyncJobs: () => ({ active }) }));

import { SyncNowButton } from "./SyncNowButton";

describe("SyncNowButton", () => {
  afterEach(() => {
    cleanup();
    Object.assign(state, { busy: false, queued: false, error: null, retryIn: 0, disabled: false });
    active = false;
    sync.mockReset();
  });

  it("starts a sync", () => {
    render(<SyncNowButton />);
    fireEvent.click(screen.getByRole("button", { name: "Sync now" }));
    expect(sync).toHaveBeenCalledTimes(1);
  });

  it("disables while jobs run", () => {
    active = true;
    render(<SyncNowButton />);
    expect(screen.getByRole("button", { name: "Syncing…" })).toBeDisabled();
  });

  it("shows the rate limit countdown", () => {
    Object.assign(state, { error: "Sync was requested recently.", retryIn: 12, disabled: true });
    render(<SyncNowButton />);
    expect(screen.getByRole("button", { name: "Sync now" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Try again in 12s.");
  });
});
