import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { EnterpriseGate } from "./EnterpriseGate";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/hooks/useEnterpriseEnabled", () => ({
  useEnterpriseEnabled: vi.fn(),
}));

import { useEnterpriseEnabled } from "@/hooks/useEnterpriseEnabled";

describe("EnterpriseGate", () => {
  beforeEach(() => {
    replace.mockReset();
  });

  it("redirects to dashboard when the extension is absent", async () => {
    vi.mocked(useEnterpriseEnabled).mockReturnValue({
      enabled: false,
      isLoading: false,
    } as ReturnType<typeof useEnterpriseEnabled>);

    const { container } = render(
      <EnterpriseGate>
        <div>secret</div>
      </EnterpriseGate>,
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
    expect(container.textContent).not.toContain("secret");
  });

  it("renders children when enabled", () => {
    vi.mocked(useEnterpriseEnabled).mockReturnValue({
      enabled: true,
      isLoading: false,
    } as ReturnType<typeof useEnterpriseEnabled>);

    const { container } = render(
      <EnterpriseGate>
        <div>recs</div>
      </EnterpriseGate>,
    );

    expect(container.textContent).toContain("recs");
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows a loading state while checking", () => {
    vi.mocked(useEnterpriseEnabled).mockReturnValue({
      enabled: false,
      isLoading: true,
    } as ReturnType<typeof useEnterpriseEnabled>);

    const { container } = render(
      <EnterpriseGate>
        <div>recs</div>
      </EnterpriseGate>,
    );

    // Loading state now shows a rotating iconic quote: “…” — Source
    expect(container.textContent).toMatch(/^“.+” — .+$/);
    expect(container.textContent).not.toContain("recs");
    expect(replace).not.toHaveBeenCalled();
  });
});
