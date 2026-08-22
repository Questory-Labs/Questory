import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LandingView } from "./auth.landing.view";
import type { LandingViewProps } from "./auth.landing.types";

const renderView = (patch: Partial<LandingViewProps>) =>
  render(
    <LandingView
      {...({
        showRegister: true,
        ...patch,
      } as LandingViewProps)}
    />,
  );

describe("LandingView", () => {
  afterEach(cleanup);

  it("shows a Sign in link", () => {
    renderView({});
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("shows Create account when showRegister is true", () => {
    renderView({ showRegister: true });
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  it("hides Create account when showRegister is false", () => {
    renderView({ showRegister: false });
    expect(
      screen.queryByRole("link", { name: "Create account" }),
    ).not.toBeInTheDocument();
  });
});
