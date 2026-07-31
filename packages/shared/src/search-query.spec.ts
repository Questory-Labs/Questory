import { describe, expect, it } from "vitest";
import {
  isDurationFilterValue,
  parseSearchQuery,
  parseSinceDate,
  shouldSearchScope,
  textForScope,
} from "./search-query";

describe("parseSearchQuery", () => {
  const now = new Date("2026-07-31T12:00:00.000Z");

  it("parses free text", () => {
    const parsed = parseSearchQuery("counter strike", now);
    expect(parsed.text).toBe("counter strike");
    expect(parsed.scopes).toEqual([]);
    expect(parsed.filters).toEqual({});
  });

  it("parses quoted scope values", () => {
    const parsed = parseSearchQuery('game:"counter strike"', now);
    expect(parsed.scopes).toEqual(["game"]);
    expect(parsed.scopeTexts.game).toBe("counter strike");
    expect(textForScope(parsed, "game")).toBe("counter strike");
  });

  it("parses scope aliases", () => {
    const parsed = parseSearchQuery("games:cs2 friend:gaben movies:godfather", now);
    expect(parsed.scopes).toContain("game");
    expect(parsed.scopes).toContain("friend");
    expect(parsed.scopes).toContain("movie");
  });

  it("parses game filters", () => {
    const parsed = parseSearchQuery("genre:rpg hours:<10 deck:true", now);
    expect(parsed.filters).toEqual({
      genre: "rpg",
      hours: "<10",
      deck: "true",
    });
  });

  it("parses within date filter", () => {
    const parsed = parseSearchQuery("movie:godfather within:<7d", now);
    expect(parsed.scopes).toEqual(["movie"]);
    expect(parsed.since).toEqual(new Date("2026-07-24T12:00:00.000Z"));
    expect(parsed.activityKind).toBe("any");
  });

  it("parses watched date filter", () => {
    const parsed = parseSearchQuery("watched:<30d", now);
    expect(parsed.activityKind).toBe("watch");
    expect(parsed.since).toEqual(new Date("2026-07-01T12:00:00.000Z"));
  });

  it("parses read duration vs read scope", () => {
    const duration = parseSearchQuery("read:<14d", now);
    expect(duration.since).toBeDefined();
    expect(duration.scopes).toEqual([]);

    const scope = parseSearchQuery("read:berserk", now);
    expect(scope.scopes).toEqual(["read"]);
    expect(scope.scopeTexts.read).toBe("berserk");
  });

  it("combines scoped text with free text", () => {
    const parsed = parseSearchQuery("game:counter strike", now);
    expect(textForScope(parsed, "game")).toBe("counter strike");
  });
});

describe("shouldSearchScope", () => {
  it("searches all when no scopes", () => {
    const parsed = parseSearchQuery("foo");
    expect(shouldSearchScope(parsed, "game")).toBe(true);
    expect(shouldSearchScope(parsed, "movie")).toBe(true);
  });

  it("limits to declared scopes", () => {
    const parsed = parseSearchQuery("game:cs2");
    expect(shouldSearchScope(parsed, "game")).toBe(true);
    expect(shouldSearchScope(parsed, "friend")).toBe(false);
  });

  it("expands watch and music scopes", () => {
    const watch = parseSearchQuery("watch:matrix");
    expect(shouldSearchScope(watch, "movie")).toBe(true);
    expect(shouldSearchScope(watch, "show")).toBe(true);

    const music = parseSearchQuery("music:radiohead");
    expect(shouldSearchScope(music, "artist")).toBe(true);
    expect(shouldSearchScope(music, "album")).toBe(true);
    expect(shouldSearchScope(music, "track")).toBe(true);
  });
});

describe("parseSinceDate", () => {
  const now = new Date("2026-07-31T12:00:00.000Z");

  it("parses day and week units", () => {
    expect(parseSinceDate("<7d", now)).toEqual(
      new Date("2026-07-24T12:00:00.000Z"),
    );
    expect(parseSinceDate("<2w", now)).toEqual(
      new Date("2026-07-17T12:00:00.000Z"),
    );
  });

  it("detects duration values", () => {
    expect(isDurationFilterValue("<7d")).toBe(true);
    expect(isDurationFilterValue("7days")).toBe(true);
    expect(isDurationFilterValue("berserk")).toBe(false);
  });
});
