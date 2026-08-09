import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ResourceStore, ResourceProvider } from "@questorylabs/qhttp/react";
import { DossierCard } from "./DossierCard";

vi.mock("@/lib/enterprise-api", () => ({
  fetchDossier: vi.fn(),
  refreshDossier: vi.fn(),
}));

import { fetchDossier, refreshDossier } from "@/lib/enterprise-api";

const fetchMock = vi.mocked(fetchDossier);
const refreshMock = vi.mocked(refreshDossier);

function dossierView(identity: string) {
  return {
    available: true,
    dossier: {
      identity,
      gaming: "You grind roguelikes.",
      music: "Not enough data.",
      watch: "Not enough data.",
      read: "Not enough data.",
      currentVibe: "Deep in Hades runs.",
      keywords: ["roguelike"],
    },
    updatedAt: Date.now(),
  };
}

function renderCard() {
  const client = new ResourceStore({ retries: false });
  return render(
    <ResourceProvider store={client}>
      <DossierCard />
    </ResourceProvider>,
  );
}

describe("DossierCard", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    refreshMock.mockReset();
    fetchMock.mockResolvedValue(dossierView("A roguelike devotee."));
  });
  afterEach(cleanup);

  it("renders nothing while unavailable", async () => {
    fetchMock.mockResolvedValue({ available: false });
    const { container } = renderCard();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container.querySelector("section")).toBeNull();
  });

  it("expands to show the dossier identity", async () => {
    renderCard();
    const toggle = await screen.findByRole("button", {
      name: /your taste fingerprint/i,
    });
    fireEvent.click(toggle);
    expect(screen.getByText("A roguelike devotee.")).toBeInTheDocument();
  });

  it("force-refresh swaps in the fresh dossier", async () => {
    refreshMock.mockResolvedValue(dossierView("Now a cozy farmer."));
    renderCard();
    const refresh = await screen.findByRole("button", {
      name: "Refresh taste fingerprint",
    });
    fireEvent.click(refresh);
    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));

    fireEvent.click(
      screen.getByRole("button", { name: /your taste fingerprint/i }),
    );
    await screen.findByText("Now a cozy farmer.");
  });

  it("disables the refresh button while pending", async () => {
    let resolve: (v: unknown) => void = () => {};
    refreshMock.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }) as never,
    );
    renderCard();
    const refresh = await screen.findByRole("button", {
      name: "Refresh taste fingerprint",
    });
    fireEvent.click(refresh);
    await waitFor(() => expect(refresh).toBeDisabled());
    resolve(dossierView("Fresh."));
    await waitFor(() => expect(refresh).not.toBeDisabled());
  });
});
