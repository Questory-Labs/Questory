import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { AppNotification } from "@questorylabs/shared";
import { NotificationBell } from "./NotificationBell";

const sample: AppNotification = {
  id: "n1",
  type: "deal",
  title: "Sale",
  body: "Game is cheap",
  href: "/wishlist",
  readAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const setListOpen = vi.fn();
const markAllRead = vi.fn();

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

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: vi.fn(),
}));

import { useNotifications } from "@/hooks/useNotifications";

describe("NotificationBell", () => {
  afterEach(() => {
    cleanup();
    setListOpen.mockReset();
    markAllRead.mockReset();
  });

  it("shows the unread badge and opens the list", () => {
    vi.mocked(useNotifications).mockReturnValue({
      unreadCount: 3,
      items: [],
      listOpen: false,
      setListOpen,
      markAllRead,
    } as ReturnType<typeof useNotifications>);

    render(<NotificationBell />);

    expect(screen.getByLabelText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Notifications"));
    expect(setListOpen).toHaveBeenCalledWith(true);
  });

  it("renders alerts and marks them read", () => {
    vi.mocked(useNotifications).mockReturnValue({
      unreadCount: 1,
      items: [sample],
      listOpen: true,
      setListOpen,
      markAllRead,
    } as ReturnType<typeof useNotifications>);

    render(<NotificationBell />);

    expect(screen.getByText("Sale")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Sale/ })).toHaveAttribute(
      "href",
      "/wishlist",
    );

    fireEvent.click(screen.getByText("Mark all read"));
    expect(markAllRead).toHaveBeenCalled();
  });
});
