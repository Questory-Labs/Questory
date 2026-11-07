import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import type { ListProviderConfig } from "@/components/sources/ListProviderCard";
import { formatDateTime } from "@/lib/dates";
import { ListProviderRow } from "./ListProviderRow";

const oauth: ListProviderConfig = {
  id: "mal",
  title: "MyAnimeList",
  blurb: "OAuth lists",
  statusPath: "/mal/status",
  authorizePath: "/mal/authorize",
};

const kitsu: ListProviderConfig = {
  id: "kitsu",
  title: "Kitsu",
  blurb: "Email and password",
  statusPath: "/kitsu/status",
  passwordConnect: true,
};

const setup = (provider: ListProviderConfig, fetchFn: unknown, queryKeyPrefix = "watch") => {
  const store = new ResourceStore({ retries: false });
  const touch = vi.spyOn(store, "touch");
  render(
    <ResourceProvider store={store}>
      <ListProviderRow
        provider={provider}
        queryKeyPrefix={queryKeyPrefix}
        fetchFn={fetchFn as <T>(path: string, init?: RequestInit) => Promise<T>}
        urlFn={(p) => `https://api.test${p}`}
      />
    </ResourceProvider>,
  );
  return { touch };
};

const kitsuFetch = (connect: () => Promise<unknown>) =>
  vi.fn().mockImplementation((path: string) =>
    path === "/kitsu/status" ? Promise.resolve({ connected: false }) : connect(),
  );

const fill = (email: string, password: string) => {
  fireEvent.change(screen.getByRole("textbox", { name: "Kitsu email" }), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
};

const submit = () => fireEvent.click(screen.getByRole("button", { name: "Connect Kitsu" }));

describe("ListProviderRow states", () => {
  afterEach(cleanup);

  it("shows the blurb and not-connected pill when disconnected", async () => {
    setup(oauth, vi.fn().mockResolvedValue({ connected: false }));
    await screen.findByRole("link", { name: "Connect" });
    expect(screen.getByText("OAuth lists")).toBeInTheDocument();
    expect(screen.getByText("Not connected")).toBeInTheDocument();
  });

  it("formats the last sync time when connected", async () => {
    const at = "2026-03-04T05:06:07.000Z";
    setup(oauth, vi.fn().mockResolvedValue({ connected: true, lastSyncedAt: at }));
    expect(await screen.findByText(`Connected · last sync ${formatDateTime(at)}`)).toBeInTheDocument();
    expect(screen.queryByText("OAuth lists")).toBeNull();
  });

  it("prefers the syncing pill over connected", async () => {
    setup(oauth, vi.fn().mockResolvedValue({ connected: true, syncing: true }));
    expect(await screen.findByText("Syncing")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Disconnect" })).toBeInTheDocument();
  });

  it("links reconnect to the authorize URL", async () => {
    setup(oauth, vi.fn().mockResolvedValue({ connected: true }));
    expect(await screen.findByRole("link", { name: "Reconnect" })).toHaveAttribute(
      "href",
      "https://api.test/mal/authorize",
    );
  });

  it("omits connect links for providers without an authorize path", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ connected: false });
    setup({ ...oauth, authorizePath: undefined }, fetchFn);
    await waitFor(() => expect(fetchFn).toHaveBeenCalled());
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("disconnects through the provider path", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ connected: true });
    const { touch } = setup(oauth, fetchFn, "read");
    fireEvent.click(await screen.findByRole("button", { name: "Disconnect" }));
    const buttons = screen.getAllByRole("button", { name: "Disconnect" });
    fireEvent.click(buttons[buttons.length - 1]);
    await waitFor(() => expect(fetchFn).toHaveBeenCalledWith("/mal", { method: "DELETE" }));
    await waitFor(() =>
      expect(touch).toHaveBeenCalledWith([["read-mal-status"], ["shell-sync-status"], ["sources-overview"]]),
    );
  });
});

describe("ListProviderRow unknown status", () => {
  afterEach(cleanup);

  it("does not claim a provider is disconnected when status fails", async () => {
    setup(oauth, vi.fn().mockRejectedValue(new Error("down")));
    expect(await screen.findByText("Status unavailable")).toBeInTheDocument();
    expect(screen.getByText("Could not check MyAnimeList right now.")).toBeInTheDocument();
    expect(screen.queryByText("Not connected")).toBeNull();
    expect(screen.queryByText("OAuth lists")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button", { name: "Disconnect" })).toBeNull();
  });

  it("hides the credential form when status fails", async () => {
    setup(kitsu, vi.fn().mockRejectedValue(new Error("down")));
    await screen.findByText("Status unavailable");
    expect(screen.queryByLabelText("Password")).toBeNull();
  });

  it("recovers through Retry", async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValue({ connected: true, lastSyncedAt: null });
    setup(oauth, fetchFn);
    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Connected")).toBeInTheDocument();
    expect(screen.queryByText("Status unavailable")).toBeNull();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });

  it("stays in the unknown state when Retry fails again", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("down"));
    setup(oauth, fetchFn);
    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.getByText("Status unavailable")).toBeInTheDocument();
  });

  it("shows a checking pill rather than not connected while loading", () => {
    setup(oauth, vi.fn().mockReturnValue(new Promise(() => undefined)));
    expect(screen.getByText("Checking…")).toBeInTheDocument();
    expect(screen.queryByText("Not connected")).toBeNull();
  });
});

describe("ListProviderRow credentials", () => {
  afterEach(cleanup);

  it("requires both email and password", async () => {
    setup(kitsu, kitsuFetch(async () => ({ ok: true })));
    const button = screen.getByRole("button", { name: "Connect Kitsu" });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "Kitsu email" }), { target: { value: "a@b.c" } });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "pw" } });
    expect(button).toBeEnabled();
  });

  it("uses a custom connect path", async () => {
    const fetchFn = kitsuFetch(async () => ({ ok: true }));
    setup({ ...kitsu, kitsuConnectPath: "/custom/connect" }, fetchFn);
    fill("a@b.c", "pw");
    submit();
    await waitFor(() =>
      expect(fetchFn).toHaveBeenCalledWith("/custom/connect", expect.objectContaining({ method: "POST" })),
    );
  });

  it("clears the password and refreshes status on success", async () => {
    const { touch } = setup(kitsu, kitsuFetch(async () => ({ ok: true })));
    fill("a@b.c", "pw");
    submit();
    await waitFor(() => expect(screen.getByLabelText("Password")).toHaveValue(""));
    expect(touch).toHaveBeenCalledWith([["watch-kitsu-status"], ["shell-sync-status"], ["sources-overview"]]);
  });

  it("shows the server error and keeps the input", async () => {
    const { touch } = setup(
      kitsu,
      kitsuFetch(async () => {
        throw new Error("Invalid credentials");
      }),
    );
    fill("a@b.c", "wrong");
    submit();
    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toHaveValue("wrong");
    expect(touch).not.toHaveBeenCalled();
  });

  it("falls back to a generic message for an empty error", async () => {
    setup(
      kitsu,
      kitsuFetch(async () => {
        throw new Error("");
      }),
    );
    fill("a@b.c", "pw");
    submit();
    expect(await screen.findByText("Connect failed")).toBeInTheDocument();
  });

  it("clears the error after a successful retry", async () => {
    let attempts = 0;
    setup(
      kitsu,
      kitsuFetch(async () => {
        attempts += 1;
        if (attempts === 1) throw new Error("Invalid credentials");
        return { ok: true };
      }),
    );
    fill("a@b.c", "pw");
    submit();
    await screen.findByText("Invalid credentials");
    submit();
    await waitFor(() => expect(screen.queryByText("Invalid credentials")).toBeNull());
  });

  it("shows a disabled busy state while connecting", async () => {
    let release: (v: unknown) => void = () => undefined;
    setup(
      kitsu,
      kitsuFetch(
        () =>
          new Promise((resolve) => {
            release = resolve;
          }),
      ),
    );
    fill("a@b.c", "pw");
    submit();
    expect(await screen.findByRole("button", { name: "Connecting…" })).toBeDisabled();
    release({ ok: true });
    expect(await screen.findByRole("button", { name: "Connect Kitsu" })).toBeInTheDocument();
  });

  it("submits from the form with Enter semantics", async () => {
    const fetchFn = kitsuFetch(async () => ({ ok: true }));
    setup(kitsu, fetchFn);
    fill("a@b.c", "pw");
    fireEvent.submit(screen.getByLabelText("Password").closest("form") as HTMLFormElement);
    await waitFor(() =>
      expect(fetchFn).toHaveBeenCalledWith("/kitsu/connect", expect.objectContaining({ method: "POST" })),
    );
  });

  it("replaces the form with disconnect once connected", async () => {
    setup(kitsu, vi.fn().mockResolvedValue({ connected: true }));
    expect(await screen.findByRole("button", { name: "Disconnect" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).toBeNull();
    expect(screen.queryByRole("link", { name: "Reconnect" })).toBeNull();
  });
});
