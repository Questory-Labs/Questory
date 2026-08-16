import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResourceStore, ResourceProvider } from "@questorylabs/qhttp/react";
import { VerifyWall } from "./VerifyWall";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

vi.mock("@/lib/auth-api", () => ({
  resendVerification: vi.fn(),
}));

function wrap(ui: React.ReactNode) {
  const qc = new ResourceStore({ retries: false });
  return render(<ResourceProvider store={qc}>{ui}</ResourceProvider>);
}

describe("VerifyWall", () => {
  it("asks the user to confirm their email", () => {
    wrap(<VerifyWall email="ada@example.com" />);
    expect(screen.getByText(/Verify your email/)).toBeInTheDocument();
    expect(
      screen.getByText(/We sent a link to ada@example.com/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Resend email" }),
    ).toBeInTheDocument();
  });
});
