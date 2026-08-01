import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusPage } from "./StatusPage";

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

describe("StatusPage", () => {
  it("renders quirky 404 copy and actions", () => {
    render(
      <StatusPage
        layout="embedded"
        code="404"
        eyebrow="Achievement unlocked"
        title="This page isn’t in your library"
        description="We checked the shelf."
        logLine="quest log › locate_page — result: null"
        primary={{ label: "Back to dashboard", href: "/dashboard" }}
        secondary={{ label: "Return home", href: "/" }}
      />,
    );

    expect(screen.getByText("Achievement unlocked")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "This page isn’t in your library" }),
    ).toBeInTheDocument();
    expect(screen.getByText("We checked the shelf.")).toBeInTheDocument();
    expect(
      screen.getByText("quest log › locate_page — result: null"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });

  it("calls reset when the primary action is a button", async () => {
    const reset = vi.fn();
    render(
      <StatusPage
        layout="embedded"
        code="500"
        eyebrow="Sync interrupted"
        title="The quest log glitched"
        description="Try again."
        primary={{ label: "Try again", onClick: reset }}
      />,
    );

    await screen.getByRole("button", { name: "Try again" }).click();
    expect(reset).toHaveBeenCalledOnce();
  });
});
