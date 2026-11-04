import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { AuthChallenge } from "@/lib/auth-api";
import { LoginView } from "./auth.login.view";
import type { LoginViewProps } from "./auth.login.types";

const challenge: AuthChallenge = {
  challengeId: "c1",
  issuedAt: 1,
  expiresAt: 2,
  token: "t",
};

const renderView = (patch: Partial<LoginViewProps>) =>
  render(
    <LoginView
      {...({
        error: null,
        setError: vi.fn(),
        pending: false,
        challenge,
        challengeLoading: false,
        refreshChallenge: vi.fn(async () => challenge),
        onSubmit: vi.fn(),
        ...patch,
      } as LoginViewProps)}
    />,
  );

describe("LoginView", () => {
  afterEach(cleanup);

  it("shows the Sign in heading", () => {
    renderView({});
    expect(screen.getByRole("heading", { name: /Sign\s+in/ })).toBeInTheDocument();
  });

  it("shows Retry when there is no challenge and loading is done", () => {
    renderView({ challenge: null, challengeLoading: false });
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("shows hatch fields for email and password", () => {
    renderView({});
    expect(screen.getByLabelText("Email")).toHaveClass("field");
    expect(screen.getByLabelText("Password")).toHaveClass("field");
  });

  it("marks credentials invalid and links to register", () => {
    renderView({ error: "Email or password is wrong. 2 tries left before sign-in pauses.", credentialError: true });
    expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getAllByRole("alert").some((n) => n.textContent?.includes("2 tries left"))).toBe(true);
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/register");
  });

  it("disables submit with a countdown while sign-in is paused", () => {
    renderView({ lockSecondsLeft: 75 });
    expect(screen.getByRole("button", { name: "Try again in 1:15" })).toBeDisabled();
    expect(screen.getByText(/Sign-in pauses after 5 failed tries/)).toBeInTheDocument();
  });
});
