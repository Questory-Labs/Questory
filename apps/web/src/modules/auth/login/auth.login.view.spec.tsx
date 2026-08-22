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
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });

  it("shows Retry when there is no challenge and loading is done", () => {
    renderView({ challenge: null, challengeLoading: false });
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("shows an error alert when error is set", () => {
    renderView({ error: "Invalid credentials" });
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Invalid credentials").length).toBeGreaterThan(0);
  });
});
