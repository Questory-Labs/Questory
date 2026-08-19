import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { ResourceStore, ResourceProvider } from "@questorylabs/qhttp/react";
import {
  QMONITOR_CLIENT_ID,
  QMONITOR_REDIRECT_URI,
  QMONITOR_SCOPE,
} from "@questorylabs/shared";

const params = new URLSearchParams({
  client_id: QMONITOR_CLIENT_ID,
  redirect_uri: QMONITOR_REDIRECT_URI,
  state: "state-ok-1",
  scope: QMONITOR_SCOPE,
  code_challenge: "c".repeat(43),
  code_challenge_method: "S256",
  device_id: "device-id-16char",
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => params,
}));

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

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
  apiOnce: vi.fn(),
}));

import { api, apiOnce } from "@/lib/api";
import { UserProvider } from "@/providers";
import QmonitorAuthorizePage from "./page";

function wrap(ui: React.ReactNode) {
  const store = new ResourceStore({ retries: false });
  return render(
    <ResourceProvider store={store}>
      <UserProvider>{ui}</UserProvider>
    </ResourceProvider>,
  );
}

describe("QmonitorAuthorizePage", () => {
  beforeEach(() => {
    vi.mocked(api).mockReset();
    vi.mocked(apiOnce).mockReset();
  });
  afterEach(cleanup);

  it("shows the qMonitor mark and a visible Log in button when signed out", async () => {
    vi.mocked(apiOnce).mockResolvedValue({ user: null });
    wrap(<QmonitorAuthorizePage />);

    expect(await screen.findByText("qMonitor")).toBeInTheDocument();
    expect(document.querySelector("img")).toHaveAttribute(
      "src",
      "/qmonitor-mark.svg",
    );

    const login = await screen.findByRole("link", { name: "Log in" });
    expect(login).toHaveClass("btn", "btn-primary");
    expect(login).toHaveTextContent("Log in");
    expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument();
  });

  it("shows Authorize once the session is ready", async () => {
    vi.mocked(apiOnce).mockResolvedValue({
      user: { id: "u1", email: "a@b.co", personaName: "Ada" },
    });
    vi.mocked(api).mockResolvedValue({ pending: "pending-token" });
    wrap(<QmonitorAuthorizePage />);

    expect(await screen.findByText(/Signed in as/)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Authorize" })).not.toBeDisabled();
    });
  });
});
