import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
    const links = screen.getAllByRole("link", { name: "Sign in" });
    expect(links[0]).toHaveAttribute("href", "/login");
  });

  it("shows Create account when showRegister is true", () => {
    renderView({ showRegister: true });
    const links = screen.getAllByRole("link", { name: "Create account" });
    expect(links[0]).toHaveAttribute("href", "/register");
  });

  it("hides Create account when showRegister is false", () => {
    renderView({ showRegister: false });
    expect(
      screen.queryByRole("link", { name: "Create account" }),
    ).not.toBeInTheDocument();
  });

  it("hides View demo unless enabled", () => {
    renderView({});
    expect(screen.queryByRole("button", { name: "View demo" })).toBeNull();
  });

  it("starts the demo from View demo", () => {
    const startDemo = vi.fn();
    renderView({ showDemo: true, startDemo });
    fireEvent.click(screen.getByRole("button", { name: "View demo" }));
    expect(startDemo).toHaveBeenCalledTimes(1);
  });

  it("numbers the four domains", () => {
    renderView({});
    expect(screen.getByText("/01")).toBeInTheDocument();
    expect(screen.getByText("/02")).toBeInTheDocument();
    expect(screen.getByText("/03")).toBeInTheDocument();
    expect(screen.getByText("/04")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Library" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Music" })).toBeInTheDocument();
  });
});
