import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { User } from "@questorylabs/shared";
import { AccountMenu } from "./AccountMenu";

vi.mock("next/navigation", () => ({
  usePathname: () => "/settings/profile",
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

const user = (patch: Partial<User> = {}) =>
  ({
    id: "u1",
    personaName: "Ada",
    avatarUrl: null,
    countryCode: "in",
    currency: "INR",
    isAdmin: false,
    ...patch,
  }) as unknown as User;

describe("AccountMenu", () => {
  afterEach(cleanup);

  it("shows the region label and opens a rounded glass menu", () => {
    render(<AccountMenu user={user()} onLogout={vi.fn()} />);
    expect(screen.getByText("IN · INR")).toBeInTheDocument();
    const trigger = screen.getByRole("button", { name: /Ada/ });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu")).toHaveClass("panel", "rounded-[18px]");
    expect(screen.getByRole("menuitem", { name: /Profile/ })).toHaveAttribute(
      "href",
      "/settings/profile",
    );
    expect(screen.queryByRole("menuitem", { name: /Admin/ })).not.toBeInTheDocument();
  });

  it("shows Region unset and the admin link for admins", () => {
    render(
      <AccountMenu user={user({ countryCode: null, isAdmin: true } as Partial<User>)} onLogout={vi.fn()} />,
    );
    expect(screen.getByText("Region unset")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Ada/ }));
    expect(screen.getByRole("menuitem", { name: /Admin/ })).toHaveAttribute("href", "/admin");
  });

  it("logs out and closes on Escape", () => {
    const onLogout = vi.fn();
    render(<AccountMenu user={user()} onLogout={onLogout} />);
    fireEvent.click(screen.getByRole("button", { name: /Ada/ }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Ada/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Log out" }));
    expect(onLogout).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
