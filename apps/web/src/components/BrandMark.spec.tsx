import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BrandMark } from "./BrandMark";

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

describe("BrandMark", () => {
  afterEach(cleanup);

  it("renders the Questory wordmark and default mark", () => {
    render(<BrandMark />);
    expect(screen.getByRole("link", { name: "Questory home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByText("Questory")).toBeInTheDocument();
    expect(document.querySelector("img")).toHaveAttribute("src", "/favicon.svg");
  });

  it("renders a custom wordmark and mark without a link", () => {
    render(
      <BrandMark
        href={null}
        wordmark="qMonitor"
        markSrc="/qmonitor-mark.svg"
      />,
    );
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("qMonitor")).toBeInTheDocument();
    expect(document.querySelector("img")).toHaveAttribute(
      "src",
      "/qmonitor-mark.svg",
    );
  });
});
