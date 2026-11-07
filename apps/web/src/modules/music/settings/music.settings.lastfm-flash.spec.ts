import { describe, expect, it } from "vitest";
import { lastfmFlashFromParams } from "./music.settings.utils";

const flash = (query: string) => lastfmFlashFromParams(new URLSearchParams(query));

describe("lastfmFlashFromParams", () => {
  it("returns null without a Last.fm result", () => {
    expect(flash("")).toBeNull();
    expect(flash("lastfm=other&reason=denied")).toBeNull();
  });

  it("reports a successful connection", () => {
    expect(flash("lastfm=connected")).toBe("connected");
  });

  it("maps known reasons to fixed text", () => {
    expect(flash("lastfm=error&reason=callback_failed")).toBe(
      "the provider callback failed",
    );
    expect(flash("lastfm=error&reason=invalid_state")).toBe(
      "the sign-in link is invalid or expired",
    );
  });

  it("never echoes an unknown reason from the URL", () => {
    expect(flash("lastfm=error&reason=Send+your+password+to+evil.example")).toBe("error");
  });

  it("does not let a reason of connected report success", () => {
    expect(flash("lastfm=error&reason=connected")).toBe("error");
  });

  it("falls back to the generic error without a reason", () => {
    expect(flash("lastfm=error")).toBe("error");
  });
});
