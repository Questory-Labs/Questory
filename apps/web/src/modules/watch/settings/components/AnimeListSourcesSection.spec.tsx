import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";

vi.mock("@/lib/watch", () => ({
  watchFetch: vi.fn(),
  watchUrl: (path: string) => `https://watch.test${path}`,
}));

import { watchFetch } from "@/lib/watch";
import { AnimeListSourcesSection } from "./AnimeListSourcesSection";

const wrap = (ui: React.ReactNode) =>
  render(<ResourceProvider store={new ResourceStore({ retries: false })}>{ui}</ResourceProvider>);

const titles = () => screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);

describe("AnimeListSourcesSection", () => {
  beforeEach(() => {
    vi.mocked(watchFetch).mockReset();
    vi.mocked(watchFetch).mockResolvedValue({ connected: false } as never);
  });
  afterEach(cleanup);

  it("lists every provider in order by default", async () => {
    wrap(<AnimeListSourcesSection />);
    expect(screen.getByRole("heading", { level: 2, name: "MAL, Kitsu, Bangumi, Shikimori" })).toBeInTheDocument();
    expect(titles()).toEqual(["MyAnimeList", "Shikimori", "Bangumi", "Kitsu"]);
    await waitFor(() => expect(watchFetch).toHaveBeenCalledTimes(4));
  });

  it("loads each provider status from its own path", async () => {
    wrap(<AnimeListSourcesSection />);
    await waitFor(() => {
      for (const path of ["/mal/status", "/shikimori/status", "/bangumi/status", "/kitsu/status"]) {
        expect(watchFetch).toHaveBeenCalledWith(path);
      }
    });
  });

  it("links OAuth providers through the watch API", async () => {
    wrap(<AnimeListSourcesSection />);
    const links = await screen.findAllByRole("link", { name: "Connect" });
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "https://watch.test/mal/authorize",
      "https://watch.test/shikimori/authorize",
      "https://watch.test/bangumi/authorize",
    ]);
  });

  it("offers a credential form for Kitsu", () => {
    wrap(<AnimeListSourcesSection />);
    expect(screen.getByRole("textbox", { name: "Kitsu email" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect Kitsu" })).toBeDisabled();
  });

  it("hides only providers explicitly disallowed", () => {
    wrap(<AnimeListSourcesSection allowed={{ mal: false, kitsu: false, bangumi: true }} />);
    expect(titles()).toEqual(["Shikimori", "Bangumi"]);
    expect(screen.queryByRole("textbox", { name: "Kitsu email" })).toBeNull();
  });

  it("does not fetch status for disallowed providers", async () => {
    wrap(<AnimeListSourcesSection allowed={{ mal: false, shikimori: false, bangumi: false }} />);
    await waitFor(() => expect(watchFetch).toHaveBeenCalledWith("/kitsu/status"));
    expect(watchFetch).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when every provider is disallowed", () => {
    const { container } = wrap(
      <AnimeListSourcesSection allowed={{ mal: false, kitsu: false, shikimori: false, bangumi: false }} />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(watchFetch).not.toHaveBeenCalled();
  });
});
