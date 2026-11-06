import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { notifyDemoBlocked, setDemoModeActive } from "@/lib/demo-mode";
import { getApiUrl } from "@/lib/runtime-env";
import { DemoBanner } from "./DemoBanner";
import { DemoSession } from "./DemoSession";

const replace = vi.fn();
const drop = vi.fn();
const bump = vi.fn();
const apiOnce = vi.fn();
let user: { isDemo?: boolean; sessionExpiresAt?: string } | null = null;

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@questorylabs/qhttp/react", () => ({ useStore: () => ({ drop }) }));
vi.mock("@/hooks/useUser", () => ({ useUser: () => ({ user }) }));
vi.mock("@/lib/api", () => ({ apiOnce: (...args: unknown[]) => apiOnce(...args) }));
vi.mock("@/providers/StatusProvider", () => ({ useDropEpochBump: () => bump }));

const inMinutes = (minutes: number) =>
  new Date(Date.now() + minutes * 60_000).toISOString();

describe("DemoSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    apiOnce.mockResolvedValue({ ok: true });
    user = { isDemo: true, sessionExpiresAt: inMinutes(2) };
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    setDemoModeActive(false);
  });

  it("stays idle for normal users", () => {
    user = { sessionExpiresAt: inMinutes(-1) };
    render(<DemoSession />);
    expect(drop).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("logs out once at expiry and clears local state", () => {
    render(<DemoSession />);
    expect(drop).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 2_000);
    });
    expect(apiOnce).toHaveBeenCalledTimes(1);
    expect(apiOnce).toHaveBeenCalledWith("/auth/logout", { method: "POST" });
    expect(drop).toHaveBeenCalledTimes(1);
    expect(bump).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("still clears local state when logout fails", () => {
    apiOnce.mockRejectedValue(new Error("offline"));
    user = { isDemo: true, sessionExpiresAt: inMinutes(-1) };
    render(<DemoSession />);
    expect(drop).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("treats a missing or invalid expiry as expired", () => {
    user = { isDemo: true, sessionExpiresAt: "not-a-date" };
    render(<DemoSession />);
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("rechecks on visibility change", () => {
    render(<DemoSession />);
    vi.setSystemTime(Date.now() + 3 * 60_000);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("shows a toast when a write is blocked", () => {
    render(<DemoSession />);
    act(() => notifyDemoBlocked());
    expect(screen.getByRole("alert").textContent).toContain("Demo is read-only");
  });

  it("stops API-origin links and leaves others", () => {
    setDemoModeActive(true);
    render(
      <>
        <DemoSession />
        <a href={`${getApiUrl()}/auth/steam`}>steam</a>
        <a href="https://example.com/x">other</a>
      </>,
    );
    expect(fireEvent.click(screen.getByText("steam"))).toBe(false);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(fireEvent.click(screen.getByText("other"))).toBe(true);
  });
});

describe("DemoBanner", () => {
  afterEach(cleanup);

  it("shows minutes left for the demo user only", () => {
    user = { isDemo: true, sessionExpiresAt: inMinutes(30) };
    render(<DemoBanner />);
    expect(screen.getByRole("status").textContent).toContain(
      "Read-only demo · 30 min left",
    );
    cleanup();
    user = {};
    render(<DemoBanner />);
    expect(screen.queryByRole("status")).toBeNull();
  });
});
