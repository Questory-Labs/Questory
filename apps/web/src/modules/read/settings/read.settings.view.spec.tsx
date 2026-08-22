import { cleanup, render, screen } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReadSettingsView } from "./read.settings.view";

vi.mock("@/lib/read", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/read")>();
  return { ...actual, readFetch: vi.fn().mockResolvedValue({ connected: false }) };
});

describe("ReadSettingsView", () => {
  afterEach(cleanup);

  it("renders live and manga list headings", () => {
    const store = new ResourceStore({ retries: false });
    render(
      <ResourceProvider store={store}>
        <ReadSettingsView />
      </ResourceProvider>,
    );
    expect(screen.getByRole("heading", { name: "Sources" })).toBeInTheDocument();
    expect(screen.getByText("AniList")).toBeInTheDocument();
  });
});
