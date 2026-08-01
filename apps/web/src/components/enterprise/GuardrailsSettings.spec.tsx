import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { GuardrailsSettings } from "./GuardrailsSettings";

vi.mock("@/lib/enterprise-api", () => ({
  fetchGuardrailSettings: vi.fn().mockResolvedValue({
    categories: { profanity: "mask", illegal_activity: "block" },
    blocklist: [],
    blocklistAction: "block",
    regexRules: [],
  }),
  saveGuardrailSettings: vi.fn(),
}));

function wrap(ui: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe("GuardrailsSettings", () => {
  it("renders category rows after load", async () => {
    wrap(<GuardrailsSettings />);
    expect(await screen.findByText("Illegal activity")).toBeInTheDocument();
    expect(screen.getByText("Profanity")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save guardrails/i })).toBeDisabled();
  });
});
