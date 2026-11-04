import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QmonitorAuthorizeView } from "./auth.oauth-qmonitor.view";
import type { QmonitorAuthorizeViewProps } from "./auth.oauth-qmonitor.types";
import {
  isAuthorizeQueryValid,
  readAuthorizeQuery,
  safeLoginNext,
} from "./auth.oauth-qmonitor.utils";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const base: QmonitorAuthorizeViewProps = {
  queryValid: true,
  isLoading: false,
  loggedIn: true,
  userLabel: "a@b.co",
  loginHref: "/login?next=x",
  error: null,
  busy: false,
  pendingReady: true,
  outcome: null,
  linkState: "pending",
  onAuthorize: vi.fn(),
  onDecline: vi.fn(),
  onBackHome: vi.fn(),
};

const renderView = (patch: Partial<QmonitorAuthorizeViewProps> = {}) =>
  render(<QmonitorAuthorizeView {...{ ...base, ...patch }} />);

describe("QmonitorAuthorizeView", () => {
  afterEach(cleanup);

  it("shows the invalid request state with Back home", () => {
    const onBackHome = vi.fn();
    renderView({ queryValid: false, onBackHome });
    expect(
      screen.getByText("Invalid qMonitor authorization request."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back home" }));
    expect(onBackHome).toHaveBeenCalled();
  });

  it("shows the session check while loading", () => {
    renderView({ isLoading: true });
    expect(screen.getByText("Checking session…")).toBeInTheDocument();
  });

  it("lists permissions, the revoke note and an error alert", () => {
    renderView({ error: "Authorize failed" });
    expect(screen.getByText("It will be able to")).toBeInTheDocument();
    expect(
      screen.getByText("Not see your password, music, watch or read data"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("You can revoke this any time in Settings → Connections."),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Authorize failed");
  });

  it("disables Authorize until the pending token is ready", () => {
    renderView({ pendingReady: false });
    expect(screen.getByRole("button", { name: "Authorize" })).toBeDisabled();
  });

  it("shows the done states", () => {
    renderView({ outcome: "approved", linkState: "ok" });
    expect(screen.getByText("qMonitor connected")).toBeInTheDocument();
    expect(screen.getByText("Linked")).toBeInTheDocument();
    cleanup();
    renderView({ outcome: "declined", linkState: "no" });
    expect(screen.getByText("Request declined")).toBeInTheDocument();
    expect(screen.getByText("Not linked")).toBeInTheDocument();
  });
});

describe("auth.oauth-qmonitor.utils", () => {
  it("keeps login next on the authorize route", () => {
    expect(safeLoginNext("/oauth/qmonitor/authorize?a=1")).toBe(
      "/oauth/qmonitor/authorize?a=1",
    );
    expect(safeLoginNext("https://evil.example")).toBe(
      "/oauth/qmonitor/authorize",
    );
  });

  it("rejects incomplete queries", () => {
    const q = readAuthorizeQuery(new URLSearchParams({ client_id: "x" }));
    expect(q.response_type).toBe("code");
    expect(isAuthorizeQueryValid(q)).toBe(false);
  });
});
