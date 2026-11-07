import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import { formatDateTime } from "@/lib/dates";
import { mockResource } from "@/test/resource-mock";

vi.mock("@/lib/watch", () => ({
  getWatchUrl: () => "https://watch.test",
  watchFetch: vi.fn(),
  watchUrl: (path: string) => `https://watch.test${path}`,
}));
vi.mock("@/components/ApiKeyPanel", () => ({
  ApiKeyPanel: ({ type, title }: { type: string; title: string }) => (
    <p>
      key panel {type} {title}
    </p>
  ),
}));
vi.mock("./LetterboxdConnectCard", () => ({
  LetterboxdConnectCard: () => <p>letterboxd card</p>,
}));

import { watchFetch } from "@/lib/watch";
import { LiveSourcesSection } from "./LiveSourcesSection";
import type { ConnStatus, UnusedSource } from "../watch.settings.types";

type Props = React.ComponentProps<typeof LiveSourcesSection>;

const options: UnusedSource[] = [
  { id: "trakt", label: "Trakt", hint: "OAuth history" },
  { id: "anilist", label: "AniList", hint: "OAuth anime" },
  { id: "webhook", label: "Plex / Jellyfin", hint: "Live webhooks" },
];

const props = (over: Partial<Props> = {}): Props => ({
  trakt: mockResource<ConnStatus>({ empty: false, failed: false, value: { connected: false } }),
  traktConnected: false,
  showTrakt: false,
  showAnilist: false,
  showWebhook: false,
  showingLive: false,
  webhookActive: false,
  chooserOptions: [],
  addOpen: false,
  setAddOpen: vi.fn(),
  selectSource: vi.fn(),
  showLetterboxdScrape: true,
  ...over,
});

const wrap = (p: Props) =>
  render(
    <ResourceProvider store={new ResourceStore({ retries: false })}>
      <LiveSourcesSection {...p} />
    </ResourceProvider>,
  );

describe("LiveSourcesSection", () => {
  beforeEach(() => {
    vi.mocked(watchFetch).mockReset();
    vi.mocked(watchFetch).mockResolvedValue({ connected: false } as never);
  });
  afterEach(cleanup);

  describe("empty state", () => {
    it("explains there is no live source and hides the add toggle", () => {
      wrap(props({ chooserOptions: options }));
      expect(screen.getByRole("heading", { level: 2, name: "Live sources" })).toBeInTheDocument();
      expect(screen.getByText("No live source yet.")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Add source" })).toBeNull();
    });

    it("offers a verb per option and selects it", () => {
      const p = props({ chooserOptions: options });
      wrap(p);
      fireEvent.click(screen.getByRole("button", { name: "Connect Trakt" }));
      expect(p.selectSource).toHaveBeenCalledWith("trakt");
      fireEvent.click(screen.getByRole("button", { name: "Connect AniList" }));
      expect(p.selectSource).toHaveBeenCalledWith("anilist");
      fireEvent.click(screen.getByRole("button", { name: "Set up Plex / Jellyfin" }));
      expect(p.selectSource).toHaveBeenCalledWith("webhook");
    });
  });

  describe("add toggle", () => {
    it("is hidden when no options remain", () => {
      wrap(props({ showingLive: true, showTrakt: true, chooserOptions: [] }));
      expect(screen.queryByRole("button", { name: "Add source" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
    });

    it("toggles through setAddOpen", () => {
      const p = props({ showingLive: true, showTrakt: true, chooserOptions: options.slice(1) });
      wrap(p);
      fireEvent.click(screen.getByRole("button", { name: "Add source" }));
      const update = vi.mocked(p.setAddOpen).mock.calls[0]?.[0] as (v: boolean) => boolean;
      expect(update(false)).toBe(true);
      expect(update(true)).toBe(false);
    });

    it("lists options with hints when open and selects one", () => {
      const p = props({ showingLive: true, showTrakt: true, addOpen: true, chooserOptions: options.slice(1) });
      wrap(p);
      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
      expect(screen.getByText("OAuth anime")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Live webhooks/ }));
      expect(p.selectSource).toHaveBeenCalledWith("webhook");
    });

    it("keeps the list closed when addOpen is false", () => {
      wrap(props({ showingLive: true, showTrakt: true, chooserOptions: options.slice(1) }));
      expect(screen.queryByText("OAuth anime")).toBeNull();
    });
  });

  describe("Trakt", () => {
    it("prompts to connect when disconnected", () => {
      wrap(props({ showingLive: true, showTrakt: true }));
      expect(screen.getByRole("link", { name: "Connect Trakt" })).toHaveAttribute(
        "href",
        "https://watch.test/trakt/authorize",
      );
      expect(screen.getByText("Not connected")).toBeInTheDocument();
      expect(screen.getByText(/Connect Trakt to sync your watched history/)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Disconnect" })).toBeNull();
    });

    it("shows sync time, reconnect and disconnect when connected", () => {
      const at = "2026-03-04T05:06:07.000Z";
      wrap(
        props({
          showingLive: true,
          showTrakt: true,
          traktConnected: true,
          trakt: mockResource<ConnStatus>({
            empty: false,
            failed: false,
            value: { connected: true, lastSyncedAt: at },
          }),
        }),
      );
      expect(screen.getByRole("link", { name: "Reconnect Trakt" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Disconnect" })).toBeInTheDocument();
      expect(screen.getByText("Connected")).toBeInTheDocument();
      expect(screen.getByText(`Connected · last sync ${formatDateTime(at)}`)).toBeInTheDocument();
    });

    it("shows never when connected without a sync", () => {
      wrap(props({ showingLive: true, showTrakt: true, traktConnected: true }));
      expect(screen.getByText("Connected · last sync never")).toBeInTheDocument();
    });

    it("disconnects through the watch API after confirmation", async () => {
      vi.mocked(watchFetch).mockResolvedValue({ ok: true, disconnected: true } as never);
      wrap(props({ showingLive: true, showTrakt: true, traktConnected: true }));
      fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
      expect(screen.getByText("Disconnect Trakt?")).toBeInTheDocument();
      const buttons = screen.getAllByRole("button", { name: "Disconnect" });
      fireEvent.click(buttons[buttons.length - 1]);
      await waitFor(() => expect(watchFetch).toHaveBeenCalledWith("/trakt", { method: "DELETE" }));
    });
  });

  describe("AniList", () => {
    it("renders the provider row and loads its status", async () => {
      wrap(props({ showingLive: true, showAnilist: true }));
      expect(screen.getByRole("heading", { level: 3, name: "AniList" })).toBeInTheDocument();
      await waitFor(() => expect(watchFetch).toHaveBeenCalledWith("/anilist/status"));
      expect(await screen.findByRole("link", { name: "Connect" })).toHaveAttribute(
        "href",
        "https://watch.test/anilist/authorize",
      );
    });

    it("is not rendered or fetched when hidden", () => {
      wrap(props({ showingLive: true, showTrakt: true }));
      expect(screen.queryByRole("heading", { name: "AniList" })).toBeNull();
      expect(watchFetch).not.toHaveBeenCalled();
    });
  });

  describe("webhooks", () => {
    it("lists both ingest URLs and the webhook key panel", () => {
      wrap(props({ showingLive: true, showWebhook: true }));
      expect(screen.getByRole("heading", { level: 3, name: "Plex / Jellyfin" })).toBeInTheDocument();
      expect(screen.getByText(/https:\/\/watch\.test\s*\/webhooks\/plex/)).toBeInTheDocument();
      expect(screen.getByText(/https:\/\/watch\.test\s*\/webhooks\/jellyfin/)).toBeInTheDocument();
      expect(screen.getByText("key panel watch_webhook Webhook key")).toBeInTheDocument();
    });

    it.each([
      [false, "Setup"],
      [true, "Active"],
    ])("webhookActive=%s shows %s", (webhookActive, label) => {
      wrap(props({ showingLive: true, showWebhook: true, webhookActive }));
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  describe("Letterboxd", () => {
    it("shows the card alongside live sources", () => {
      wrap(props({ showingLive: true, showTrakt: true }));
      expect(screen.getByText("letterboxd card")).toBeInTheDocument();
    });

    it("hides the card when scraping is disabled", () => {
      wrap(props({ showingLive: true, showTrakt: true, showLetterboxdScrape: false }));
      expect(screen.queryByText("letterboxd card")).toBeNull();
    });

    it("stays reachable with no live source chosen", () => {
      wrap(props({ chooserOptions: options }));
      expect(screen.getByText("No live source yet.")).toBeInTheDocument();
      expect(screen.getByText("letterboxd card")).toBeInTheDocument();
    });

    it("stays reachable when every live source is disabled", () => {
      wrap(props());
      expect(screen.getByText("letterboxd card")).toBeInTheDocument();
      expect(screen.queryByText("No live source yet.")).toBeNull();
    });

    it("hides the section when nothing can be connected", () => {
      const { container } = wrap(props({ showLetterboxdScrape: false }));
      expect(container).toBeEmptyDOMElement();
    });

    it("shows the card when the flag is undefined", () => {
      wrap(props({ showingLive: true, showTrakt: true, showLetterboxdScrape: undefined as unknown as boolean }));
      expect(screen.getByText("letterboxd card")).toBeInTheDocument();
    });
  });
});
