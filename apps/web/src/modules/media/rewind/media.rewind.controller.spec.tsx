import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ResourceProvider, ResourceStore, type UseResourceResult } from "@questorylabs/qhttp/react";
import type { RewindInsightResponse } from "@questorylabs/shared";
import { RewindController } from "./media.rewind.controller";

vi.mock("@/lib/api", () => ({ api: vi.fn() }));
vi.mock("@/lib/music", () => ({ musicFetch: vi.fn() }));
vi.mock("@/lib/watch", () => ({ watchFetch: vi.fn() }));
vi.mock("@/lib/read", () => ({ readFetch: vi.fn() }));
vi.mock("@/lib/games", () => ({ gamesFetch: vi.fn() }));
vi.mock("@/hooks/useEnterpriseEnabled", () => ({ useEnterpriseEnabled: () => ({ when: true }) }));
vi.mock("@/hooks/useMusicEnabled", () => ({ useMusicEnabled: () => ({ showMusicNav: true }) }));
vi.mock("@/hooks/useWatchEnabled", () => ({ useWatchEnabled: () => ({ enabled: true }) }));
vi.mock("@/hooks/useReadEnabled", () => ({ useReadEnabled: () => ({ showReadNav: true }) }));
vi.mock("@questorylabs/shared", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@questorylabs/shared")>()),
  isRewindAiGenerationAllowed: () => true,
  getRewindAiPeriodError: () => null,
}));

import { api } from "@/lib/api";
import { gamesFetch } from "@/lib/games";

const insight = (content: string): RewindInsightResponse => ({
  period: "2026-10",
  content,
  generatedAt: "2026-11-04T13:42:19.851Z",
  cached: false,
});

const Probe = ({
  aiQuery,
  handleRedo,
  forceRedo,
}: {
  aiQuery?: UseResourceResult<RewindInsightResponse>;
  handleRedo?: () => void;
  forceRedo?: boolean;
}) => (
  <div>
    <p data-testid="content">{aiQuery?.value?.content ?? ""}</p>
    <p data-testid="refreshing">{String(aiQuery?.refreshing)}</p>
    <p data-testid="force">{String(forceRedo)}</p>
    <button type="button" onClick={handleRedo}>
      redo
    </button>
  </div>
);

const aiCalls = () =>
  vi.mocked(api).mock.calls.map(([path]) => String(path)).filter((path) => path.includes("/rewind/ai"));

describe("RewindController regenerate", () => {
  let release: (value: RewindInsightResponse) => void;

  beforeEach(() => {
    vi.mocked(api).mockReset();
    let aiRequest = 0;
    vi.mocked(api).mockImplementation((path: string) => {
      if (!path.includes("/rewind/ai")) return Promise.reject(new Error("stats unused"));
      aiRequest += 1;
      if (aiRequest === 1) return Promise.resolve(insight("old insight"));
      return new Promise((resolve) => {
        release = resolve as (value: RewindInsightResponse) => void;
      });
    });
  });

  afterEach(cleanup);

  it("shows the regenerated insight and forces exactly one request", async () => {
    render(
      <ResourceProvider store={new ResourceStore()}>
        <RewindController domain="all">
          <Probe />
        </RewindController>
      </ResourceProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("content")).toHaveTextContent("old insight"));

    fireEvent.click(screen.getByRole("button", { name: "redo" }));
    await waitFor(() => expect(screen.getByTestId("refreshing")).toHaveTextContent("true"));
    expect(screen.getByTestId("force")).toHaveTextContent("true");

    await act(async () => {
      release(insight("new insight"));
    });

    await waitFor(() => expect(screen.getByTestId("content")).toHaveTextContent("new insight"));
    expect(screen.getByTestId("force")).toHaveTextContent("false");
    const calls = aiCalls();
    expect(calls).toHaveLength(2);
    expect(calls[0]).not.toContain("forceRedo=true");
    expect(calls[1]).toContain("forceRedo=true");
  });

  it("does not force a redo for another domain opened while one is running", async () => {
    vi.mocked(gamesFetch).mockReset();
    vi.mocked(gamesFetch).mockResolvedValue(insight("games insight") as never);
    const tree = (domain: "all" | "games") => (
      <ResourceProvider store={store}>
        <RewindController domain={domain}>
          <Probe />
        </RewindController>
      </ResourceProvider>
    );
    const store = new ResourceStore();
    const { rerender } = render(tree("all"));
    await waitFor(() => expect(screen.getByTestId("content")).toHaveTextContent("old insight"));

    fireEvent.click(screen.getByRole("button", { name: "redo" }));
    await waitFor(() => expect(aiCalls()).toHaveLength(2));
    rerender(tree("games"));

    await waitFor(() =>
      expect(vi.mocked(gamesFetch).mock.calls.some(([path]) => String(path).includes("/rewind/ai"))).toBe(true),
    );
    for (const [path] of vi.mocked(gamesFetch).mock.calls) {
      expect(String(path)).not.toContain("forceRedo=true");
    }
  });
});
