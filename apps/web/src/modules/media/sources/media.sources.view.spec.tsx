import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MediaSourcesView } from "./media.sources.view";
import type { MediaSourcesViewProps } from "./media.sources.types";

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

const props = (over: Partial<MediaSourcesViewProps> = {}): MediaSourcesViewProps => ({
  tabs: [
    { value: "music", label: "Music" },
    { value: "watch", label: "Watch" },
  ],
  tab: "music",
  loading: false,
  onTabChange: vi.fn(),
  ...over,
});

describe("MediaSourcesView", () => {
  afterEach(cleanup);

  it("renders the selected domain and switches tabs", () => {
    const p = props();
    render(<MediaSourcesView {...p} />);
    expect(screen.getByText("music sources")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /Watch/ }));
    expect(p.onTabChange).toHaveBeenCalledWith("watch");
  });

  it("hides the switcher with a single module", () => {
    render(<MediaSourcesView {...props({ tabs: [{ value: "read", label: "Read" }], tab: "read" })} />);
    expect(screen.getByText("read sources")).toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "Module" })).toBeNull();
  });

  it("shows connected counts, the domain noun and OAuth flash messages", () => {
    const overview = {
      value: {
        connected: 3,
        domains: [
          { domain: "music", connected: 1, providers: [] },
          { domain: "watch", connected: 2, providers: [] },
        ],
      },
    } as unknown as MediaSourcesViewProps["overview"];
    render(
      <MediaSourcesView
        {...props({
          tab: "watch",
          overview,
          flash: [{ provider: "trakt", ok: true, text: "Trakt connected." }],
        })}
      />,
    );
    expect(screen.getByText(/3 connected/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Where your watching comes from");
    expect(screen.getByRole("tab", { name: /Watch/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Watch/ })).toHaveTextContent("2");
    expect(screen.getByRole("status")).toHaveTextContent("Trakt connected.");
  });

  it("explains when no media module is enabled", () => {
    render(<MediaSourcesView {...props({ tabs: [], tab: null })} />);
    expect(screen.getByText("No media modules enabled")).toBeInTheDocument();
  });
});
