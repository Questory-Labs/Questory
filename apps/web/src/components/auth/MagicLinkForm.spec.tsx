import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MagicLinkForm } from "./MagicLinkForm";

vi.mock("@/lib/auth-api", () => ({
  requestMagicLink: vi.fn(),
  parseApiError: (err: unknown) => ({
    message: err instanceof Error ? err.message : "err",
  }),
}));

import { requestMagicLink } from "@/lib/auth-api";

describe("MagicLinkForm", () => {
  beforeEach(() => {
    vi.mocked(requestMagicLink).mockReset();
  });

  it("sends a magic link and shows a generic success", async () => {
    vi.mocked(requestMagicLink).mockResolvedValue({ ok: true });
    render(<MagicLinkForm />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Email me a link" }));
    await waitFor(() =>
      expect(screen.getByText(/a link is on its way/)).toBeInTheDocument(),
    );
    expect(requestMagicLink).toHaveBeenCalledWith("ada@example.com");
  });
});
