import { cleanup, render, screen } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRef } from "react";
import { mockResource } from "@/test/resource-mock";
import { MusicSettingsView } from "./music.settings.view";
import type {
  IdentityResponse,
  MusicSettingsViewProps,
} from "./music.settings.types";

vi.mock("@/lib/api", () => ({
  api: vi.fn().mockResolvedValue({ keys: [] }),
}));

vi.mock("@/lib/music", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/music")>();
  return {
    ...actual,
    musicFetch: vi.fn().mockResolvedValue({}),
    fetchMusicHealth: vi.fn().mockResolvedValue({
      ok: true,
      service: "questorylabs-music",
      lastfmConfigured: false,
    }),
  };
});

const baseProps = (): MusicSettingsViewProps => ({
  identity: mockResource<IdentityResponse>({
    empty: false,
    failed: false,
    value: {
      steamId: null,
      listenbrainzUsername: null,
      keys: [],
    },
  }),
  ingestActive: false,
  nativeLocked: false,
  lastfmFlash: null,
  fileName: null,
  message: null,
  jobId: null,
  job: null,
  restoring: false,
  dragging: false,
  busy: false,
  failed: false,
  showProgress: false,
  inputRef: createRef<HTMLInputElement | null>(),
  onInputChange: () => {},
  onDrop: () => {},
  setDragging: () => {},
});

describe("MusicSettingsView", () => {
  afterEach(cleanup);

  it("renders the sources heading", () => {
    const store = new ResourceStore({ retries: false });
    render(
      <ResourceProvider store={store}>
        <MusicSettingsView
          {...(baseProps() as unknown as Record<string, unknown>)}
        />
      </ResourceProvider>,
    );
    expect(screen.getByRole("heading", { name: "Sources" })).toBeInTheDocument();
    expect(screen.getByText("History upload")).toBeInTheDocument();
  });
});
