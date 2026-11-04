import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RecapSettingsPanel } from "./RecapSettingsPanel";

vi.mock("@/lib/api", () => ({ api: vi.fn() }));

import { api } from "@/lib/api";

function wrap() {
  const store = new ResourceStore({ retries: false });
  return render(
    <ResourceProvider store={store}>
      <RecapSettingsPanel />
    </ResourceProvider>,
  );
}

describe("RecapSettingsPanel", () => {
  afterEach(() => cleanup());
  beforeEach(() => vi.mocked(api).mockReset());

  it("opts in through the settings endpoint", async () => {
    let monthly = false;
    vi.mocked(api).mockImplementation(async (_path: string, init?: RequestInit) => {
      if (init?.method === "PUT") monthly = JSON.parse(String(init.body)).monthly;
      return { monthly, global: false } as never;
    });
    wrap();
    const box = await screen.findByRole("checkbox");
    await waitFor(() => expect(box).not.toBeDisabled());
    fireEvent.click(box);
    await waitFor(() =>
      expect(vi.mocked(api)).toHaveBeenCalledWith("/recap/settings", {
        method: "PUT",
        body: JSON.stringify({ monthly: true }),
      }),
    );
    await waitFor(() => expect(box).toBeChecked());
  });

  it("locks the toggle when an admin enabled it globally", async () => {
    vi.mocked(api).mockResolvedValue({ monthly: true, global: true } as never);
    wrap();
    expect(await screen.findByText("Enabled for everyone by your admin.")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeDisabled();
  });
});
