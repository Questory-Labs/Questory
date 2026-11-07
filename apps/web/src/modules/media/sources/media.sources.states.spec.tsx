import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";

const state = vi.hoisted(() => ({
  search: "",
  music: { showMusicNav: true, isLoading: false },
  watch: true,
  read: true,
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: state.replace }),
  useSearchParams: () => new URLSearchParams(state.search),
}));
vi.mock("@/hooks/useMusicEnabled", () => ({ useMusicEnabled: () => state.music }));
vi.mock("@/hooks/useWatchEnabled", () => ({ useWatchEnabled: () => ({ enabled: state.watch }) }));
vi.mock("@/hooks/useReadEnabled", () => ({ useReadEnabled: () => ({ showReadNav: state.read }) }));
vi.mock("@/lib/api", () => ({ api: vi.fn() }));
vi.mock("@/modules/music/settings/music.settings.controller", () => ({
  MusicSettingsController: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/modules/music/settings/music.settings.view", () => ({
  MusicSettingsView: () => <p>music sources</p>,
}));
vi.mock("@/modules/watch/settings/watch.settings.controller", () => ({
  WatchSettingsController: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/modules/watch/settings/watch.settings.view", () => ({
  WatchSettingsView: () => <p>watch sources</p>,
}));
vi.mock("@/modules/read/settings/read.settings.view", () => ({
  ReadSettingsView: () => <p>read sources</p>,
}));

import { api } from "@/lib/api";
import { MediaSourcesController } from "./media.sources.controller";
import { MediaSourcesView } from "./media.sources.view";

const page = () =>
  render(
    <ResourceProvider store={new ResourceStore({ retries: false })}>
      <MediaSourcesController>
        <MediaSourcesView />
      </MediaSourcesController>
    </ResourceProvider>,
  );

describe("sources page states", () => {
  beforeEach(() => {
    state.search = "";
    state.music = { showMusicNav: true, isLoading: false };
    state.watch = true;
    state.read = true;
    state.replace.mockReset();
    vi.mocked(api).mockReset();
    vi.mocked(api).mockResolvedValue({ connected: 0, domains: [] });
  });
  afterEach(cleanup);

  it("defaults to the first enabled domain", () => {
    page();
    expect(screen.getByText("music sources")).toBeInTheDocument();
  });

  it("opens the requested domain", () => {
    state.search = "tab=read";
    page();
    expect(screen.getByText("read sources")).toBeInTheDocument();
    expect(screen.queryByText("music sources")).toBeNull();
  });

  it.each([
    ["music", { music: false }, "watch sources", ["Watch", "Read"]],
    ["watch", { watch: false }, "music sources", ["Music", "Read"]],
    ["read", { read: false }, "music sources", ["Music", "Watch"]],
  ] as const)("removes a disabled %s domain even when requested", (tab, flags, shown, labels) => {
    state.search = `tab=${tab}`;
    if ("music" in flags) state.music = { showMusicNav: false, isLoading: false };
    if ("watch" in flags) state.watch = false;
    if ("read" in flags) state.read = false;
    page();
    expect(screen.getByText(shown)).toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(labels);
  });

  it("falls back to the first domain for an unknown tab", () => {
    state.search = "tab=bogus";
    page();
    expect(screen.getByText("music sources")).toBeInTheDocument();
  });

  it("shows the empty state when every domain is off", () => {
    state.music = { showMusicNav: false, isLoading: false };
    state.watch = false;
    state.read = false;
    page();
    expect(screen.getByText("No media modules enabled")).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("shows loading rather than the empty state while flags resolve", () => {
    state.music = { showMusicNav: false, isLoading: true };
    state.watch = false;
    state.read = false;
    page();
    expect(screen.queryByText("No media modules enabled")).toBeNull();
    expect(screen.queryByRole("tabpanel")).toBeNull();
  });

  it("renders an empty overview with a zero summary", async () => {
    page();
    expect(await screen.findByText(/0 connected · music, watch, read/)).toBeInTheDocument();
  });

  it("keeps the page usable when the overview fails", async () => {
    vi.mocked(api).mockRejectedValue(new Error("down"));
    page();
    await waitFor(() => expect(api).toHaveBeenCalledWith("/sources"));
    expect(screen.getByText("music sources")).toBeInTheDocument();
    expect(screen.queryByText(/connected ·/)).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Where your listening comes from");
  });

  it("shows an OAuth failure with its reason from the URL", () => {
    state.search = "tab=watch&mal=error&reason=denied";
    page();
    expect(screen.getByRole("alert")).toHaveTextContent("Could not connect MyAnimeList: denied.");
  });

  it("shows several OAuth results together", () => {
    state.search = "trakt=connected&anilist=connected&bangumi=error";
    page();
    expect(screen.getByRole("alert")).toHaveTextContent("Could not connect Bangumi.");
    expect(screen.getAllByRole("status").map((s) => s.textContent)).toEqual([
      "Trakt connected.",
      "AniList connected.",
    ]);
  });

  it("shows no flash without OAuth params", () => {
    state.search = "tab=watch";
    page();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("keeps other params when switching tabs", () => {
    state.search = "tab=music&utm=x";
    page();
    fireEvent.click(screen.getByRole("tab", { name: /Read/ }));
    expect(state.replace).toHaveBeenCalledWith("/sources?tab=read&utm=x", { scroll: false });
  });
});
