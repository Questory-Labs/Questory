import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RecommendationsPanel } from "./RecommendationsPanel";

const heuristicResponse = {
  available: true,
  engine: "qengine/0.1.0",
  userId: "u1",
  generatedAt: "2026-07-22T20:00:00Z",
  ml: { enabled: false, ready: false },
  items: [
    {
      kind: "game",
      domain: "games",
      gameId: "g1",
      name: "Hades",
      score: 0.91,
      reasons: ["You never finished it"],
      itemKey: "game:g1",
    },
  ],
};

type FetchCall = { url: string; init?: RequestInit };
let calls: FetchCall[] = [];

function installFetch() {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      const respond = (body: unknown) =>
        new Response(JSON.stringify(body), { status: 200 });

      if (url.includes("/v1/recommendations/curate/cache")) {
        return respond({ cached: false });
      }
      if (url.includes("/v1/recommendations/curate/")) {
        return respond({
          jobId: "j1",
          status: "scouting",
          events: [
            { ts: 1, stage: "scout", message: "searching web for “cozy”" },
          ],
        });
      }
      if (url.includes("/v1/recommendations/curate")) {
        return respond({ jobId: "j1", status: "queued", events: [] });
      }
      if (url.includes("/v1/recommendations/feedback")) {
        return respond({ ok: true });
      }
      if (url.includes("/v1/recommendations")) {
        return respond(heuristicResponse);
      }
      if (url.includes("/v1/enterprise/dossier")) {
        return respond({ available: false });
      }
      if (url.includes("/v1/enterprise/settings")) {
        return respond({});
      }
      return new Response("{}", { status: 404 });
    }),
  );
}

function renderPanel() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <RecommendationsPanel />
    </QueryClientProvider>,
  );
}

describe("RecommendationsPanel", () => {
  beforeEach(installFetch);
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("mood submit starts a curation job and shows the progress view", async () => {
    renderPanel();
    await screen.findByText("Hades");

    fireEvent.change(screen.getByRole("textbox", { name: "Mood" }), {
      target: { value: "something cozy" },
    });
    fireEvent.click(await screen.findByRole("button", { name: "Curate" }));

    // The curate call carries the mood in context.
    await waitFor(() => {
      const curate = calls.find(
        (c) =>
          c.url.endsWith("/v1/recommendations/curate") &&
          c.init?.method === "POST",
      );
      expect(curate).toBeTruthy();
      const body = JSON.parse(curate?.init?.body as string);
      expect(body.context.mood).toBe("something cozy");
      expect(body.force).toBe(false);
    });

    // The job poll renders the live progress view with activity events.
    await screen.findByText("Scouting");
    await screen.findByText(/searching web for/);
  });

  it("dismiss is optimistic: feedback fires and the card animates out", async () => {
    renderPanel();
    await screen.findByText("Hades");

    fireEvent.click(screen.getByRole("button", { name: "Dismiss Hades" }));

    // Optimistic: the card starts animating out immediately.
    const card = screen.getByText("Hades").closest("article") as HTMLElement;
    expect(card.dataset.dismissed).toBe("true");

    // The feedback request fires with action=dismiss.
    await waitFor(() => {
      const fb = calls.find((c) =>
        c.url.endsWith("/v1/recommendations/feedback"),
      );
      expect(fb).toBeTruthy();
      expect(JSON.parse(fb?.init?.body as string)).toEqual({
        itemKey: "game:g1",
        action: "dismiss",
      });
    });

    // After the exit animation the card is removed entirely.
    await waitFor(() => {
      expect(screen.queryByText("Hades")).not.toBeInTheDocument();
    });
  });

  it("like is optimistic and toggles the active state", async () => {
    renderPanel();
    await screen.findByText("Hades");

    const like = screen.getByRole("button", { name: "Like Hades" });
    fireEvent.click(like);
    expect(like.dataset.active).toBe("true");

    await waitFor(() => {
      const fb = calls.find((c) =>
        c.url.endsWith("/v1/recommendations/feedback"),
      );
      expect(JSON.parse(fb?.init?.body as string)).toEqual({
        itemKey: "game:g1",
        action: "like",
      });
    });
  });
});
