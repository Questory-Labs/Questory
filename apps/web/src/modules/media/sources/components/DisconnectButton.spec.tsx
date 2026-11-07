import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import { DisconnectButton } from "./DisconnectButton";

type FetchFn = <T>(path: string, init?: RequestInit) => Promise<T>;

const setup = (fetchFn: unknown, over: { description?: string; touches?: string[] } = {}) => {
  const store = new ResourceStore({ retries: false });
  const touch = vi.spyOn(store, "touch");
  render(
    <ResourceProvider store={store}>
      <DisconnectButton
        title="Trakt"
        path="/trakt"
        fetchFn={fetchFn as FetchFn}
        touches={over.touches ?? ["trakt-status"]}
        description={over.description}
      />
    </ResourceProvider>,
  );
  return { touch };
};

const openDialog = () => fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));

const confirm = () => {
  const buttons = screen.getAllByRole("button", { name: "Disconnect" });
  fireEvent.click(buttons[buttons.length - 1]);
};

describe("DisconnectButton", () => {
  afterEach(cleanup);

  it("keeps the dialog closed until asked", () => {
    setup(vi.fn());
    expect(screen.queryByText("Disconnect Trakt?")).toBeNull();
  });

  it("explains the default consequence", () => {
    setup(vi.fn());
    openDialog();
    expect(screen.getByText(/Syncing from Trakt stops and its stored tokens are removed/)).toBeInTheDocument();
    expect(screen.getByText(/History already imported stays/)).toBeInTheDocument();
  });

  it("uses a custom description", () => {
    setup(vi.fn(), { description: "Custom consequence." });
    openDialog();
    expect(screen.getByText("Custom consequence.")).toBeInTheDocument();
    expect(screen.queryByText(/stored tokens/)).toBeNull();
  });

  it("closes the dialog and refreshes every dependent resource on success", async () => {
    const { touch } = setup(vi.fn().mockResolvedValue({ ok: true, disconnected: true }), {
      touches: ["trakt-status", "watch-sync-status"],
    });
    openDialog();
    confirm();
    await waitFor(() => expect(screen.queryByText("Disconnect Trakt?")).toBeNull());
    expect(touch).toHaveBeenCalledWith([
      ["trakt-status"],
      ["watch-sync-status"],
      ["shell-sync-status"],
      ["sources-overview"],
    ]);
  });

  it("refreshes shared resources even with no extra touches", async () => {
    const { touch } = setup(vi.fn().mockResolvedValue({ ok: true }), { touches: [] });
    openDialog();
    confirm();
    await waitFor(() => expect(touch).toHaveBeenCalledWith([["shell-sync-status"], ["sources-overview"]]));
  });

  it("keeps the dialog open and shows the error on failure", async () => {
    const { touch } = setup(vi.fn().mockRejectedValue(new Error("Provider unavailable")));
    openDialog();
    confirm();
    expect(await screen.findByText("Provider unavailable")).toBeInTheDocument();
    expect(screen.getByText("Disconnect Trakt?")).toBeInTheDocument();
    expect(touch).not.toHaveBeenCalled();
  });

  it("falls back to a generic message for an empty error", async () => {
    setup(vi.fn().mockRejectedValue(new Error("")));
    openDialog();
    confirm();
    expect(await screen.findByText("Disconnect failed")).toBeInTheDocument();
  });

  it("clears the error after a successful retry", async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("Provider unavailable"))
      .mockResolvedValueOnce({ ok: true });
    setup(fetchFn);
    openDialog();
    confirm();
    await screen.findByText("Provider unavailable");
    confirm();
    await waitFor(() => expect(screen.queryByText("Disconnect Trakt?")).toBeNull());
    openDialog();
    expect(screen.queryByText("Provider unavailable")).toBeNull();
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["Cancel", () => fireEvent.click(screen.getByRole("button", { name: "Cancel" }))],
    ["Escape", () => fireEvent.keyDown(window, { key: "Escape" })],
  ])("drops a failed attempt's error after %s and reopen", async (_name, close) => {
    setup(vi.fn().mockRejectedValue(new Error("Provider unavailable")));
    openDialog();
    confirm();
    await screen.findByText("Provider unavailable");
    close();
    expect(screen.queryByText("Disconnect Trakt?")).toBeNull();
    openDialog();
    expect(screen.getByText("Disconnect Trakt?")).toBeInTheDocument();
    expect(screen.queryByText("Provider unavailable")).toBeNull();
  });

  it("shows a disabled busy state while the request runs", async () => {
    let release: (v: unknown) => void = () => undefined;
    setup(
      vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            release = resolve;
          }),
      ),
    );
    openDialog();
    confirm();
    expect(await screen.findByRole("button", { name: "Disconnecting…" })).toBeDisabled();
    release({ ok: true });
    await waitFor(() => expect(screen.queryByText("Disconnect Trakt?")).toBeNull());
  });

  it("closes on Escape without calling the API", () => {
    const fetchFn = vi.fn();
    setup(fetchFn);
    openDialog();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText("Disconnect Trakt?")).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
