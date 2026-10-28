import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import { DisconnectButton } from "./DisconnectButton";
import { ListProviderRow } from "./ListProviderRow";
import { SourceRow, SourceStatusPill } from "./SourceRow";
import { SourcesFlash } from "./SourcesFlash";
import { SourcesHeader } from "./SourcesHeader";

const wrap = (ui: React.ReactNode) =>
  render(<ResourceProvider store={new ResourceStore({ retries: false })}>{ui}</ResourceProvider>);

const mal = {
  id: "mal",
  title: "MyAnimeList",
  blurb: "OAuth",
  statusPath: "/mal/status",
  authorizePath: "/mal/authorize",
};

describe("sources components", () => {
  afterEach(cleanup);

  it("SourceRow renders title, status, blurb, action and body", () => {
    render(
      <SourceRow
        label="OAuth"
        title="Trakt"
        tone="ok"
        status={<SourceStatusPill tone="ok">Connected</SourceStatusPill>}
        blurb="Synced"
        action={<button type="button">Act</button>}
      >
        body
      </SourceRow>,
    );
    expect(screen.getByRole("heading", { name: "Trakt" })).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("OAuth")).toBeInTheDocument();
    expect(screen.getByText("Synced")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Act" })).toBeInTheDocument();
    expect(screen.getByText("body")).toBeInTheDocument();
  });

  it("DisconnectButton confirms in a dialog before DELETE", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true });
    wrap(<DisconnectButton title="Trakt" path="/trakt" fetchFn={fetchFn} touches={["trakt-status"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    expect(fetchFn).not.toHaveBeenCalled();
    expect(screen.getByText("Disconnect Trakt?")).toBeInTheDocument();
    const buttons = screen.getAllByRole("button", { name: "Disconnect" });
    fireEvent.click(buttons[buttons.length - 1]);
    await waitFor(() => expect(fetchFn).toHaveBeenCalledWith("/trakt", { method: "DELETE" }));
  });

  it("DisconnectButton cancel does nothing", () => {
    const fetchFn = vi.fn();
    wrap(<DisconnectButton title="Trakt" path="/trakt" fetchFn={fetchFn} touches={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("ListProviderRow offers OAuth connect when disconnected", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ connected: false });
    wrap(<ListProviderRow provider={mal} queryKeyPrefix="watch" fetchFn={fetchFn} urlFn={(p) => `https://api${p}`} />);
    expect(await screen.findByRole("link", { name: "Connect" })).toHaveAttribute("href", "https://api/mal/authorize");
    expect(fetchFn).toHaveBeenCalledWith("/mal/status");
  });

  it("ListProviderRow shows reconnect and disconnect when connected", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ connected: true, lastSyncedAt: null });
    wrap(<ListProviderRow provider={mal} queryKeyPrefix="read" fetchFn={fetchFn} urlFn={(p) => p} />);
    expect(await screen.findByRole("link", { name: "Reconnect" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Disconnect" })).toBeInTheDocument();
    expect(screen.getByText(/last sync never/)).toBeInTheDocument();
  });

  it("ListProviderRow posts Kitsu credentials", async () => {
    const fetchFn = vi
      .fn()
      .mockImplementation(async (path: string) => (path === "/kitsu/status" ? { connected: false } : { ok: true }));
    wrap(
      <ListProviderRow
        provider={{ id: "kitsu", title: "Kitsu", blurb: "Email", statusPath: "/kitsu/status", passwordConnect: true }}
        queryKeyPrefix="watch"
        fetchFn={fetchFn}
        urlFn={(p) => p}
      />,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Kitsu email" }), { target: { value: "a@b.c" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "pw" } });
    fireEvent.click(screen.getByRole("button", { name: "Connect Kitsu" }));
    await waitFor(() =>
      expect(fetchFn).toHaveBeenCalledWith(
        "/kitsu/connect",
        expect.objectContaining({ method: "POST", body: JSON.stringify({ email: "a@b.c", password: "pw" }) }),
      ),
    );
  });

  it("SourcesFlash renders ok and error messages", () => {
    render(
      <SourcesFlash
        messages={[
          { provider: "trakt", ok: true, text: "Trakt connected." },
          { provider: "mal", ok: false, text: "Could not connect MyAnimeList." },
        ]}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Trakt connected.");
    expect(screen.getByRole("alert")).toHaveTextContent("Could not connect MyAnimeList.");
  });

  it("SourcesHeader switches tabs", () => {
    const onTabChange = vi.fn();
    render(
      <SourcesHeader
        tabs={[
          { value: "music", label: "Music" },
          { value: "read", label: "Read" },
        ]}
        tab="music"
        onTabChange={onTabChange}
      />,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Where your listening comes from");
    fireEvent.click(screen.getByRole("tab", { name: "Read" }));
    expect(onTabChange).toHaveBeenCalledWith("read");
  });
});
