import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams("tab=watch&trakt=connected"),
}));
vi.mock("@/hooks/useMusicEnabled", () => ({
  useMusicEnabled: () => ({ showMusicNav: true, isLoading: false }),
}));
vi.mock("@/hooks/useWatchEnabled", () => ({ useWatchEnabled: () => ({ enabled: true }) }));
vi.mock("@/hooks/useReadEnabled", () => ({ useReadEnabled: () => ({ showReadNav: false }) }));
vi.mock("@/lib/api", () => ({
  api: vi.fn().mockResolvedValue({ connected: 2, domains: [] }),
}));

import { api } from "@/lib/api";
import { MediaSourcesController } from "./media.sources.controller";
import type { MediaSourcesViewProps } from "./media.sources.types";

const Probe = (props: Record<string, unknown>) => {
  const p = props as MediaSourcesViewProps;
  return (
    <div>
      <p>tab {p.tab}</p>
      <p>tabs {p.tabs.map((t) => t.value).join(",")}</p>
      <p>flash {p.flash?.map((f) => f.text).join("|")}</p>
      <p>connected {p.overview?.value?.connected ?? "-"}</p>
      <button type="button" onClick={() => p.onTabChange("music")}>
        music
      </button>
    </div>
  );
};

describe("MediaSourcesController", () => {
  afterEach(cleanup);

  it("derives tabs, flash and overview and preserves params on tab change", async () => {
    render(
      <ResourceProvider store={new ResourceStore({ retries: false })}>
        <MediaSourcesController>
          <Probe />
        </MediaSourcesController>
      </ResourceProvider>,
    );
    expect(screen.getByText("tab watch")).toBeInTheDocument();
    expect(screen.getByText("tabs music,watch")).toBeInTheDocument();
    expect(screen.getByText("flash Trakt connected.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("connected 2")).toBeInTheDocument());
    expect(api).toHaveBeenCalledWith("/sources");
    fireEvent.click(screen.getByRole("button", { name: "music" }));
    expect(replace).toHaveBeenCalledWith("/sources?tab=music&trakt=connected", { scroll: false });
  });
});
