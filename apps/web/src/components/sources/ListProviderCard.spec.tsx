import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ResourceProvider, ResourceStore } from "@questorylabs/qhttp/react";
import { formatDateTime } from "@/lib/dates";
import { ListProviderCard, type ListProviderConfig } from "./ListProviderCard";

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

const setup = (
  provider: ListProviderConfig,
  fetchFn: <T>(path: string, init?: RequestInit) => Promise<T>,
  eyebrow?: "oauth" | "credentials" | "live",
) => {
  const store = new ResourceStore({ retries: false });
  const touch = vi.spyOn(store, "touch");
  render(
    <ResourceProvider store={store}>
      <ListProviderCard
        provider={provider}
        queryKeyPrefix="watch"
        fetchFn={fetchFn}
        urlFn={(p) => `https://api.test${p}`}
        eyebrow={eyebrow}
      />
    </ResourceProvider>,
  );
  return { touch };
};

const statusFetch = (status: unknown) =>
  vi.fn().mockResolvedValue(status) as unknown as <T>(path: string, init?: RequestInit) => Promise<T>;

const fillKitsu = (email: string, password: string) => {
  fireEvent.change(screen.getByPlaceholderText("Kitsu email"), { target: { value: email } });
  fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: password } });
};

describe("ListProviderCard", () => {
  afterEach(cleanup);

  it("loads status from the provider path", async () => {
    const fetchFn = statusFetch({ connected: false });
    setup(oauth, fetchFn);
    await waitFor(() => expect(fetchFn).toHaveBeenCalledWith("/mal/status"));
  });

  it("shows the blurb and an authorize link when disconnected", async () => {
    setup(oauth, statusFetch({ connected: false }));
    const link = await screen.findByRole("link", { name: "Connect MyAnimeList" });
    expect(link).toHaveAttribute("href", "https://api.test/mal/authorize");
    expect(screen.getByRole("heading", { name: "MyAnimeList" })).toBeInTheDocument();
    expect(screen.getByText("OAuth lists")).toBeInTheDocument();
    expect(screen.getByText("Connect")).toBeInTheDocument();
  });

  it("shows reconnect and a never-synced line when connected without a sync", async () => {
    setup(oauth, statusFetch({ connected: true, lastSyncedAt: null }));
    expect(await screen.findByRole("link", { name: "Reconnect MyAnimeList" })).toHaveAttribute(
      "href",
      "https://api.test/mal/authorize",
    );
    expect(screen.getByText("Connected · last sync never")).toBeInTheDocument();
    expect(screen.queryByText("OAuth lists")).toBeNull();
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("formats the last sync time when connected", async () => {
    const at = "2026-03-04T05:06:07.000Z";
    setup(oauth, statusFetch({ connected: true, lastSyncedAt: at }));
    expect(await screen.findByText(`Connected · last sync ${formatDateTime(at)}`)).toBeInTheDocument();
  });

  it("offers no link for a provider without an authorize path", async () => {
    setup({ ...oauth, authorizePath: undefined }, statusFetch({ connected: false }));
    await screen.findByText("OAuth lists");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("shows an unknown state and hides connect controls when status fails", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("down"));
    setup(kitsu, fetchFn as never);
    expect(await screen.findByText("Status unavailable")).toBeInTheDocument();
    expect(screen.getByText("Could not check Kitsu right now.")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Password")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("recovers through Retry", async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValue({ connected: true, lastSyncedAt: null });
    setup(oauth, fetchFn as never);
    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Connected · last sync never")).toBeInTheDocument();
    expect(screen.queryByText("Status unavailable")).toBeNull();
  });

  it("stays in the unknown state when Retry fails again", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("down"));
    setup(oauth, fetchFn as never);
    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Status unavailable")).toBeInTheDocument();
  });

  it("prefers the syncing pill over connected", async () => {
    setup(oauth, statusFetch({ connected: true, syncing: true, lastSyncedAt: null }));
    expect(await screen.findByText("Syncing")).toBeInTheDocument();
    expect(screen.queryByText("Connected")).toBeNull();
  });

  it.each([
    ["OAuth", oauth, undefined],
    ["Live", oauth, "live"],
    ["Credentials", oauth, "credentials"],
    ["Credentials", kitsu, undefined],
    ["Live", kitsu, "live"],
    ["OAuth", kitsu, "oauth"],
  ] as const)("labels the eyebrow %s", async (label, provider, eyebrow) => {
    setup(provider, statusFetch({ connected: false }), eyebrow);
    expect(await screen.findByText(label)).toBeInTheDocument();
  });

  describe("password connect", () => {
    it("keeps submit disabled until email and password are filled", async () => {
      setup(kitsu, statusFetch({ connected: false }));
      const button = await screen.findByRole("button", { name: "Connect Kitsu" });
      expect(button).toBeDisabled();
      fireEvent.change(screen.getByPlaceholderText("Kitsu email"), { target: { value: "a@b.c" } });
      expect(button).toBeDisabled();
      fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "pw" } });
      expect(button).toBeEnabled();
      fireEvent.change(screen.getByPlaceholderText("Kitsu email"), { target: { value: "" } });
      expect(button).toBeDisabled();
    });

    it("does not render an authorize link", async () => {
      setup(kitsu, statusFetch({ connected: false }));
      await screen.findByRole("button", { name: "Connect Kitsu" });
      expect(screen.queryByRole("link")).toBeNull();
    });

    it("posts credentials as JSON to the default path", async () => {
      const fetchFn = vi.fn().mockImplementation(async (path: string) =>
        path === "/kitsu/status" ? { connected: false } : { ok: true },
      );
      setup(kitsu, fetchFn as never);
      fillKitsu("a@b.c", "secret");
      fireEvent.click(screen.getByRole("button", { name: "Connect Kitsu" }));
      await waitFor(() =>
        expect(fetchFn).toHaveBeenCalledWith("/kitsu/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "a@b.c", password: "secret" }),
        }),
      );
    });

    it("posts to a custom connect path", async () => {
      const fetchFn = vi.fn().mockImplementation(async (path: string) =>
        path === "/kitsu/status" ? { connected: false } : { ok: true },
      );
      setup({ ...kitsu, kitsuConnectPath: "/read/kitsu/connect" }, fetchFn as never);
      fillKitsu("a@b.c", "secret");
      fireEvent.click(screen.getByRole("button", { name: "Connect Kitsu" }));
      await waitFor(() =>
        expect(fetchFn).toHaveBeenCalledWith("/read/kitsu/connect", expect.objectContaining({ method: "POST" })),
      );
    });

    it("clears the password and refreshes status on success", async () => {
      const fetchFn = vi.fn().mockImplementation(async (path: string) =>
        path === "/kitsu/status" ? { connected: false } : { ok: true },
      );
      const { touch } = setup(kitsu, fetchFn as never);
      fillKitsu("a@b.c", "secret");
      fireEvent.click(screen.getByRole("button", { name: "Connect Kitsu" }));
      await waitFor(() => expect(screen.getByPlaceholderText("Password")).toHaveValue(""));
      expect(screen.getByPlaceholderText("Kitsu email")).toHaveValue("a@b.c");
      expect(touch).toHaveBeenCalledWith(["watch-kitsu-status"]);
      expect(touch).toHaveBeenCalledWith(["shell-sync-status"]);
      expect(touch).toHaveBeenCalledWith(["sources-overview"]);
    });

    it("shows the server error and keeps the entered password", async () => {
      const fetchFn = vi.fn().mockImplementation(async (path: string) => {
        if (path === "/kitsu/status") return { connected: false };
        throw new Error("Invalid credentials");
      });
      const { touch } = setup(kitsu, fetchFn as never);
      fillKitsu("a@b.c", "wrong");
      fireEvent.click(screen.getByRole("button", { name: "Connect Kitsu" }));
      expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Password")).toHaveValue("wrong");
      expect(touch).not.toHaveBeenCalled();
    });

    it("clears a previous error after a successful retry", async () => {
      let attempts = 0;
      const fetchFn = vi.fn().mockImplementation(async (path: string) => {
        if (path === "/kitsu/status") return { connected: false };
        attempts += 1;
        if (attempts === 1) throw new Error("Invalid credentials");
        return { ok: true };
      });
      setup(kitsu, fetchFn as never);
      fillKitsu("a@b.c", "wrong");
      fireEvent.click(screen.getByRole("button", { name: "Connect Kitsu" }));
      await screen.findByText("Invalid credentials");
      fireEvent.click(screen.getByRole("button", { name: "Connect Kitsu" }));
      await waitFor(() => expect(screen.queryByText("Invalid credentials")).toBeNull());
    });

    it("shows a busy label and blocks resubmits while connecting", async () => {
      let release: (v: unknown) => void = () => undefined;
      const fetchFn = vi.fn().mockImplementation((path: string) =>
        path === "/kitsu/status"
          ? Promise.resolve({ connected: false })
          : new Promise((resolve) => {
              release = resolve;
            }),
      );
      setup(kitsu, fetchFn as never);
      fillKitsu("a@b.c", "secret");
      fireEvent.click(screen.getByRole("button", { name: "Connect Kitsu" }));
      expect(await screen.findByRole("button", { name: "Connecting…" })).toBeDisabled();
      release({ ok: true });
      expect(await screen.findByRole("button", { name: "Connect Kitsu" })).toBeInTheDocument();
    });

    it("hides the credential form once connected", async () => {
      setup(kitsu, statusFetch({ connected: true, lastSyncedAt: null }));
      await screen.findByText("Connected · last sync never");
      expect(screen.queryByPlaceholderText("Kitsu email")).toBeNull();
      expect(screen.queryByPlaceholderText("Password")).toBeNull();
    });

    it("offers no dead reconnect link once connected", async () => {
      setup(kitsu, statusFetch({ connected: true, lastSyncedAt: null }));
      await screen.findByText("Connected · last sync never");
      expect(screen.queryByRole("link")).toBeNull();
    });
  });
});
