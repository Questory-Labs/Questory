import { cleanup, render, screen } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRef } from "react";
import { mockResource } from "@/test/resource-mock";
import { WatchSettingsView } from "./watch.settings.view";
import type { WatchSettingsViewProps } from "./watch.settings.types";

vi.mock("@/lib/watch", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/watch")>();
  return { ...actual, watchFetch: vi.fn().mockResolvedValue({ connected: false }) };
});

const baseProps = (): WatchSettingsViewProps => ({
  trakt: mockResource({ empty: false, failed: false, value: { connected: false } }),
  traktConnected: false,
  showTrakt: false,
  showAnilist: false,
  showWebhook: false,
  showingLive: false,
  webhookActive: false,
  chooserOptions: [
    { id: "trakt", label: "Trakt", hint: "OAuth · watched history sync" },
  ],
  addOpen: false,
  setAddOpen: () => {},
  selectSource: () => {},
  file: null,
  dragging: false,
  busy: false,
  progress: null,
  include: {
    diary: true,
    ratings: true,
    watched: false,
    watchlist: true,
  },
  importMsg: null,
  importOk: false,
  importFailed: false,
  isCsv: false,
  inputRef: createRef<HTMLInputElement | null>(),
  onInputChange: () => {},
  onDrop: () => {},
  setDragging: () => {},
  toggleKind: () => {},
  onImport: () => {},
  clearFile: () => {},
});

describe("WatchSettingsView", () => {
  afterEach(cleanup);

  it("renders sources heading and the empty live prompt", () => {
    const store = new ResourceStore({ retries: false });
    render(
      <ResourceProvider store={store}>
        <WatchSettingsView
          {...(baseProps() as unknown as Record<string, unknown>)}
        />
      </ResourceProvider>,
    );
    expect(screen.getByRole("heading", { name: "Sources" })).toBeInTheDocument();
    expect(screen.getByText("No live source yet.")).toBeInTheDocument();
  });
});
