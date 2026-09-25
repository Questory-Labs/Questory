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
  PlanHero: () => null,
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
});
