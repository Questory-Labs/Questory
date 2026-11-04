import { describe, expect, it } from "vitest";
import { listenSearchWhere, listenSourceWhere } from "./listen-source";

describe("listenSourceWhere", () => {
  it("matches the Last.fm poller client", () => {
    expect(listenSourceWhere("lastfm")).toEqual({
      submissionClient: { in: ["questory_lastfm"] },
    });
  });

  it("matches import clients by suffix", () => {
    expect(listenSourceWhere("imports")).toEqual({
      submissionClient: { endsWith: "_import" },
    });
  });

  it("treats everything else, including null, as ListenBrainz", () => {
    expect(listenSourceWhere("listenbrainz")).toEqual({
      OR: [
        { submissionClient: null },
        {
          AND: [
            { submissionClient: { notIn: ["questory_lastfm"] } },
            { NOT: { submissionClient: { endsWith: "_import" } } },
          ],
        },
      ],
    });
  });
});

describe("listenSearchWhere", () => {
  it("searches track, artist and album names case-insensitively", () => {
    const match = { contains: "moon", mode: "insensitive" };
    expect(listenSearchWhere("moon")).toEqual({
      track: {
        OR: [
          { title: match },
          { displayName: match },
          { artist: { name: match } },
          { release: { title: match } },
          { release: { displayName: match } },
        ],
      },
    });
  });
});
