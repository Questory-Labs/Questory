import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { ResourceStore, ResourceProvider } from "@questorylabs/qhttp/react";
import { describe, expect, it, vi } from "vitest";
import { GuardrailsController } from "./enterprise.guardrails.controller";
import { GuardrailsView } from "./enterprise.guardrails.view";

vi.mock("@/lib/enterprise-api", () => ({
  fetchGuardrailSettings: vi.fn().mockResolvedValue({
    categories: { profanity: "mask", illegal_activity: "block" },
    blocklist: [],
    blocklistAction: "block",
    regexRules: [],
  }),
  saveGuardrailSettings: vi.fn(),
}));

vi.mock("@/hooks/useEnterpriseEnabled", () => ({
  useEnterpriseEnabled: () => ({
    enabled: true,
    isLoading: false,
    when: true,
  }),
}));

const wrap = (ui: ReactNode) => {
  const client = new ResourceStore({ retries: false });
  return render(
    <ResourceProvider store={client}>{ui}</ResourceProvider>,
  );
};

describe("GuardrailsController", () => {
  it("renders category rows after load", async () => {
    wrap(
      <GuardrailsController>
        <GuardrailsView />
      </GuardrailsController>,
    );
    expect(await screen.findByText("Illegal activity")).toBeInTheDocument();
    expect(screen.getByText("Profanity")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save guardrails/i })).toBeDisabled();
  });
});
