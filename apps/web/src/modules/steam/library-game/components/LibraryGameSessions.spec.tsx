import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { PlaySessionPage } from "@questorylabs/shared";
import { LibraryGameSessions } from "./LibraryGameSessions";

const reload = async () => undefined;

const resource = (
  patch: Partial<UseResourceResult<PlaySessionPage>> &
    Pick<UseResourceResult<PlaySessionPage>, "empty" | "failed">,
): UseResourceResult<PlaySessionPage> =>
  ({
    value: undefined,
    error: patch.failed ? new Error("fail") : null,
    busy: false,
    refreshing: false,
    updatedAt: 0,
    reload,
    ready: !patch.empty && !patch.failed,
    ...patch,
  }) as UseResourceResult<PlaySessionPage>;

const page: PlaySessionPage = {
  total: 1,
  page: 1,
  pageSize: 8,
  items: [
    {
      id: "ps1",
      title: "Portal",
      source: "steam",
      appId: 400,
      gameId: "game-1",
      startedAt: "2026-09-11T11:00:00.000Z",
      endedAt: "2026-09-11T12:00:00.000Z",
      durationSecs: 3600,
      exe: "portal.exe",
      hostOs: "windows",
      hostName: "pc",
      game: {
        id: "game-1",
        name: "Portal",
        headerImage: null,
        appId: 400,
      },
    },
  ],
};

describe("LibraryGameSessions", () => {
  afterEach(cleanup);

  it("hides when there are no sessions", () => {
    const { container } = render(
      <LibraryGameSessions
        sessions={resource({
          empty: false,
          failed: false,
          value: { total: 0, page: 1, pageSize: 8, items: [] },
        })}
      />,
    );
    expect(container.querySelector("section")).toBeNull();
  });

  it("lists a session with a link to /sessions", () => {
    render(
      <LibraryGameSessions
        sessions={resource({ empty: false, failed: false, value: page })}
      />,
    );
    expect(screen.getByText("Recent sessions")).toBeInTheDocument();
    expect(screen.getByText("1h")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "All sessions →" })).toHaveAttribute(
      "href",
      "/sessions",
    );
  });

  it("shows an error when the list failed", () => {
    render(
      <LibraryGameSessions
        sessions={resource({ empty: true, failed: true })}
      />,
    );
    expect(screen.getByText("Could not load sessions.")).toBeInTheDocument();
  });
});
