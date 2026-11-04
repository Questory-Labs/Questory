import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { StatusPage } from "./StatusPage";
import { taglinePool } from "@/lib/status-taglines";

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
  afterEach(cleanup);

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

  it("renders a random tagline when taglineContext is set without description", () => {
    render(
      <StatusPage
        layout="embedded"
        code="404"
        eyebrow="Achievement unlocked"
        title="This page isn’t in your library"
        taglineContext="notFound"
        primary={{ label: "Back to dashboard", href: "/dashboard" }}
      />,
    );

    const sources = taglinePool("notFound").map((t) => `— ${t.source}`);
    expect(sources.some((s) => screen.queryByText(s) !== null)).toBe(true);
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

  it("renders the code pill, serif accent and reference", () => {
    render(
      <StatusPage
        layout="embedded"
        code="500"
        eyebrow="Server error"
        title="Something broke"
        titleAccent="on our side"
        description="Your data is safe."
        reference="abc12345-def6"
        tone="danger"
        primary={{ label: "Try again", onClick: vi.fn() }}
        secondary={{ label: "Go home", href: "/" }}
      />,
    );

    expect(screen.getByRole("img", { name: "500" })).toBeInTheDocument();
    expect(screen.getByText("Server error")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Something broke on our side" }),
    ).toBeInTheDocument();
    expect(screen.getByText("abc12345-def6")).toBeInTheDocument();
    expect(screen.getByText(/share this with the admin/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go home" })).toHaveClass("btn-ghost");
  });
});
