import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { AuthChallenge } from "@/lib/auth-api";
import { RegisterView } from "./auth.register.view";
import type { RegisterViewProps } from "./auth.register.types";

const challenge: AuthChallenge = {
  challengeId: "c1",
  issuedAt: 1,
  expiresAt: 2,
  token: "t",
};

const renderView = (patch: Partial<RegisterViewProps>) =>
  render(
    <RegisterView
      {...({
        error: null,
        setError: vi.fn(),
        pending: false,
        challenge,
        challengeLoading: false,
        refreshChallenge: vi.fn(async () => challenge),
        onSubmit: vi.fn(),
        closed: false,
        ...patch,
      } as RegisterViewProps)}
    />,
  );

describe("RegisterView", () => {
  afterEach(cleanup);

  it("shows the Create account heading", () => {
    renderView({});
    expect(
      screen.getByRole("heading", { name: "Create account" }),
    ).toBeInTheDocument();
  });

  it("shows the closed message when registration is closed", () => {
    renderView({ closed: true });
    expect(
      screen.getByText("Registration is currently closed on this instance."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  });

  it("shows the form when registration is not closed", () => {
    renderView({ closed: false });
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
  });
});
