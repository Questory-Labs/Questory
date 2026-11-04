import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { mockResource } from "@/test/resource-mock";
import type {
  CurationJob,
  RecommendationResponse,
  UserSettings,
} from "@/lib/enterprise-types";
import { RecommendationsView } from "./enterprise.recommendations.view";
import type { RecommendationsViewProps } from "./enterprise.recommendations.types";

vi.mock("./components/DossierCard", () => ({
  DossierCard: () => null,
}));

vi.mock("./components/MoodBar", () => ({
  MoodBar: () => <div data-testid="mood-bar" />,
}));

vi.mock("./components/LocationSettings", () => ({
  LocationSettings: () => null,
}));

vi.mock("./components/AgentProgress", () => ({
  AgentProgress: () => null,
}));

vi.mock("./components/PlanHero", () => ({
  PlanHero: () => <div data-testid="plan-hero" />,
}));

vi.mock("./components/PreviousSlates", () => ({
  PreviousSlates: () => <div data-testid="previous-slates" />,
}));

const hadesResponse: RecommendationResponse = {
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

const baseProps = (): RecommendationsViewProps => ({
  tab: "all",
  setTab: () => undefined,
  dayPart: "Sunday evening",
  jobId: null,
  peekHeuristics: false,
  setPeekHeuristics: () => undefined,
  curated: null,
  fromCache: false,
  votes: {},
  fading: new Set(),
  dismissed: new Set(),
  settingsOpen: false,
  setSettingsOpen: () => undefined,
  recs: mockResource<RecommendationResponse>({
    empty: false,
    failed: false,
    value: hadesResponse,
  }),
  settings: mockResource<UserSettings>({
    empty: false,
    failed: false,
    value: {},
  }),
  job: mockResource<CurationJob>({ empty: true, failed: false }),
  curate: () => undefined,
  useCached: () => undefined,
  recurate: () => undefined,
  onFeedback: () => undefined,
});

const renderView = (patch: Partial<RecommendationsViewProps> = {}) =>
  render(
    <RecommendationsView
      {...({ ...baseProps(), ...patch } as RecommendationsViewProps)}
    />,
  );

describe("RecommendationsView", () => {
  afterEach(cleanup);

  it("shows an error when recs failed, even if empty", () => {
    renderView({
      recs: mockResource<RecommendationResponse>({
        empty: true,
        failed: true,
      }),
    });
    expect(
      screen.getByText("Could not load recommendations. Is QEngine running?"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Scoring your libraries…"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Hades")).not.toBeInTheDocument();
  });

  it("shows a loading message when recs are empty", () => {
    renderView({
      recs: mockResource<RecommendationResponse>({
        empty: true,
        failed: false,
      }),
    });
    expect(screen.getByText("Scoring your libraries…")).toBeInTheDocument();
    expect(screen.queryByText("Hades")).not.toBeInTheDocument();
  });

  it("renders items when recs are ready", () => {
    renderView({});
    expect(screen.getByText("Hades")).toBeInTheDocument();
    expect(
      screen.queryByText("Scoring your libraries…"),
    ).not.toBeInTheDocument();
  });

  it("renders a duplicate extra key only once", () => {
    renderView({
      recs: mockResource<RecommendationResponse>({
        empty: false,
        failed: false,
        value: {
          available: true,
          engine: "qengine/0.1.0",
          items: [
            {
              kind: "game",
              domain: "games",
              name: "Steam Machine",
              score: 0.45,
              reasons: ["Popular in your region"],
              itemKey: "ext:regional-new:steam-machine",
            },
            {
              kind: "game",
              domain: "games",
              name: "Steam Machine",
              score: 0.45,
              reasons: ["Popular in your region"],
              itemKey: "ext:regional-new:steam-machine",
            },
          ],
        },
      }),
    });
    expect(screen.getAllByText("Steam Machine")).toHaveLength(1);
  });

  it("shows collection empty when ready with no items", () => {
    renderView({
      recs: mockResource<RecommendationResponse>({
        empty: false,
        failed: false,
        value: {
          available: true,
          engine: "qengine/0.1.0",
          items: [],
        },
      }),
    });
    expect(
      screen.getByText(/Nothing to recommend yet/),
    ).toBeInTheDocument();
    expect(screen.queryByText("Hades")).not.toBeInTheDocument();
  });

  it("renders research picks above the library strip", () => {
    renderView({
      curated: {
        available: true,
        engine: "qengine/0.1.0",
        items: [
          {
            kind: "movie",
            domain: "watch",
            name: "Hereditary",
            score: 0.82,
            reasons: ["Fits your ask, not in your library"],
            itemKey: "research:tmdb:movie:1",
          },
        ],
        library: [
          {
            kind: "game",
            domain: "games",
            name: "Hades",
            score: 0.7,
            reasons: ["You never finished it"],
            itemKey: "game:g1",
          },
        ],
      },
    });
    expect(screen.getByText("Hereditary")).toBeInTheDocument();
    expect(screen.getByText("From your library")).toBeInTheDocument();
    expect(screen.getByText("Hades")).toBeInTheDocument();
  });

  it("credits the reason-tier model in the footer", () => {
    renderView({
      curated: {
        available: true,
        engine: "qengine/0.1.0",
        llm: {
          enabled: true,
          ready: true,
          model: "base/model",
          tiers: [
            { tier: "reason", model: "deepseek/deepseek-v4.1-flash", reasoning: "low" },
            { tier: "fast", model: "qwen/fast", reasoning: "off" },
          ],
        },
        items: [
          {
            kind: "movie",
            domain: "watch",
            name: "Hereditary",
            score: 0.82,
            reasons: ["Fits your ask"],
            itemKey: "research:tmdb:movie:1",
          },
        ],
      },
    });
    expect(
      screen.getByText(/curated by deepseek\/deepseek-v4\.1-flash/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/heuristic order/)).not.toBeInTheDocument();
  });

  it("leads with the curator's why and shows the history strip", () => {
    renderView({
      curated: {
        available: true,
        engine: "qengine/0.1.0",
        arm: "rerank",
        items: [
          {
            kind: "game",
            domain: "games",
            name: "Hades",
            score: 0.9,
            reasons: ["You never finished it"],
            why: "Your roguelike streak stalled on the last boss; one more run fits tonight.",
            itemKey: "game:g1",
          },
        ],
      },
    });
    expect(
      screen.getByText(/one more run fits tonight/),
    ).toBeInTheDocument();
    expect(screen.getByText("You never finished it")).toBeInTheDocument();
    expect(screen.getByTestId("previous-slates")).toBeInTheDocument();
  });

  it("badges play-together picks", () => {
    renderView({
      curated: {
        available: true,
        engine: "qengine/0.1.0",
        arm: "rerank",
        items: [
          {
            kind: "game",
            domain: "games",
            name: "Deep Rock Galactic",
            score: 0.8,
            reasons: ["3 friends played this in the last two weeks"],
            itemKey: "game:g2",
            cardType: "social",
          },
        ],
      },
    });
    expect(screen.getByText("Play together")).toBeInTheDocument();
  });

  it("notes when the slate fell back to the heuristic order", () => {
    renderView({
      curated: {
        available: true,
        engine: "qengine/0.1.0",
        arm: "rerank-fallback",
        llm: { enabled: true, ready: true, model: "m" },
        items: [
          {
            kind: "game",
            domain: "games",
            name: "Hades",
            score: 0.9,
            reasons: ["You never finished it"],
            itemKey: "game:g1",
          },
        ],
      },
    });
    expect(screen.getByText(/heuristic order \(model unavailable\)/)).toBeInTheDocument();
  });

  it("puts the day part and city in the eyebrow and counts the picks", () => {
    renderView({
      settings: mockResource<UserSettings>({
        empty: false,
        failed: false,
        value: { city: "Bengaluru" },
      }),
    });
    expect(screen.getByText("Sunday evening · Bengaluru")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Location" })).toBeInTheDocument();
    expect(screen.getByText(/· 1 pick$/)).toBeInTheDocument();
  });

  it("asks for a location when none is set", () => {
    renderView({});
    expect(screen.getByText("Sunday evening")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Set your location" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "All" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("shows the plan only for a curated all-domains slate", () => {
    const curated: RecommendationResponse = {
      ...hadesResponse,
      plan: { title: "One run, one album", steps: [{ itemIndex: 0, note: "Start here" }] },
    };
    renderView({ curated });
    expect(screen.getByTestId("plan-hero")).toBeInTheDocument();
    cleanup();
    renderView({ curated, tab: "games" });
    expect(screen.queryByTestId("plan-hero")).not.toBeInTheDocument();
  });

  it("marks a cached curated slate", () => {
    renderView({
      curated: { ...hadesResponse, moodSummary: "short and calm" },
      fromCache: true,
    });
    expect(screen.getByText("Cached")).toBeInTheDocument();
    expect(screen.getByText(/short and calm/)).toBeInTheDocument();
  });
});
