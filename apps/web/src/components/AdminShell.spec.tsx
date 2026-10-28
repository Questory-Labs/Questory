import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AdminShell } from "./AdminShell";

const replace = vi.fn();
let pathname = "/admin";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => pathname,
}));

vi.mock("@/components/BrandMark", () => ({
  BrandMark: () => <span>questory</span>,
}));

vi.mock("@/hooks/useEnterpriseEnabled", () => ({
  useEnterpriseEnabled: vi.fn(),
}));

vi.mock("@/hooks/useUser", () => ({
  useUser: vi.fn(),
}));

import { useEnterpriseEnabled } from "@/hooks/useEnterpriseEnabled";
import { useUser } from "@/hooks/useUser";

const setUser = (user: unknown, authReady = true) =>
  vi.mocked(useUser).mockReturnValue({ user, authReady } as ReturnType<typeof useUser>);

const setEnterprise = (when: boolean) =>
  vi.mocked(useEnterpriseEnabled).mockReturnValue({
    when,
    enabled: when,
    isLoading: false,
  } as unknown as ReturnType<typeof useEnterpriseEnabled>);

describe("AdminShell", () => {
  beforeEach(() => {
    replace.mockReset();
    pathname = "/admin";
    setEnterprise(false);
  });
  afterEach(cleanup);

  it("redirects anonymous users to login", async () => {
    setUser(null);
    render(<AdminShell>content</AdminShell>);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("content")).toBeNull();
  });

  it("shows the access-required state and redirects non-admins", async () => {
    setUser({ isAdmin: false, email: "a@x.io" });
    render(<AdminShell>content</AdminShell>);
    expect(screen.getByText(/Admin access required/)).toBeInTheDocument();
    expect(screen.queryByText("content")).toBeNull();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
  });

  it("renders the instance nav with the active item and back link", () => {
    pathname = "/admin/cron";
    setUser({ isAdmin: true, email: "root@x.io" });
    render(<AdminShell>content</AdminShell>);
    expect(screen.getByText("content")).toBeInTheDocument();
    expect(screen.getByText("Instance")).toBeInTheDocument();
    expect(screen.queryByText("QEngine")).toBeNull();
    expect(screen.getByRole("link", { name: "Cron, scrapers, enrichment" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Back to app" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });

  it("shows the QEngine group when enterprise is enabled", () => {
    setEnterprise(true);
    setUser({ isAdmin: true, email: "root@x.io" });
    render(<AdminShell>content</AdminShell>);
    expect(screen.getByText("QEngine")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Guardrails" })).toHaveAttribute(
      "href",
      "/admin/guardrails",
    );
  });

  it("opens the mobile menu", () => {
    setUser({ isAdmin: true, email: "root@x.io" });
    render(<AdminShell>content</AdminShell>);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("navigation", { name: "Admin mobile" })).toBeInTheDocument();
  });
});
