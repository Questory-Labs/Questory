import { describe, expect, it } from "vitest";
import {
  activePrereleaseBase,
  activeRcBase,
  aggregateServiceReleaseState,
  canaryTagPatterns,
  compareSemver,
  formatDockerVersion,
  gitHighestTag,
  incPatch,
  latestStableVersion,
  nextCanaryNumber,
  parseSemver,
  rcTagPattern,
  resolveCanaryBase,
  resolveCanaryVersion,
  stableTagPattern,
} from "./release-version.mjs";

const sampleTags = [
  "docker-api-1.2.3",
  "docker-web-1.2.3",
  "docker-api-1.3.0-rc.1",
  "docker-web-v1.3.0-rc.1",
  "docker-api-v1.3.0-canary.4",
  "docker-web-v1.3.0-canary.4",
  "docker-api-canary.20250802.abc1234",
];

describe("tag patterns", () => {
  it("builds stable, rc, and canary git ref patterns", () => {
    expect(stableTagPattern("api")).toBe("refs/tags/docker-api-[0-9]*.[0-9]*.[0-9]*");
    expect(rcTagPattern("web")).toBe("refs/tags/docker-web-*-rc.*");
    expect(canaryTagPatterns("api", "0.0.17")).toEqual([
      "refs/tags/docker-api-v0.0.17-canary.*",
      "refs/tags/docker-api-0.0.17-canary.*",
    ]);
  });
});

describe("aggregateServiceReleaseState", () => {
  it("collects stable, rc, and canary state in one pass", () => {
    const state = aggregateServiceReleaseState(sampleTags, "api");
    expect(state.latestStable).toBe("1.2.3");
    expect(state.rcBase).toBe("1.3.0");
    expect(state.canaryMaxByBase.get("1.3.0")).toBe(4);
  });
});

describe("resolveCanaryBase", () => {
  it("uses rc base when it is ahead of stable patch bump", () => {
    expect(resolveCanaryBase("1.2.3", "1.3.0")).toBe("1.3.0");
    expect(resolveCanaryBase("0.0.16", "")).toBe("0.0.17");
  });
});

describe("gitHighestTag", () => {
  it("returns the highest matching tag without listing the full set", () => {
    expect(gitHighestTag([stableTagPattern("api")])).toBe("docker-api-0.0.16");
    expect(gitHighestTag(canaryTagPatterns("api", "0.0.18"))).toBe(
      "docker-api-v0.0.18-canary.10",
    );
    expect(gitHighestTag([rcTagPattern("api")])).toBe("");
  });
});

describe("parseSemver", () => {
  it("parses plain and v-prefixed versions", () => {
    expect(parseSemver("1.2.3").raw).toBe("1.2.3");
    expect(parseSemver("v1.2.3").raw).toBe("1.2.3");
  });

  it("rejects invalid versions", () => {
    expect(() => parseSemver("1.2")).toThrow(/Invalid semver/);
  });
});

describe("compareSemver", () => {
  it("orders versions", () => {
    expect(compareSemver("1.2.3", "1.2.4")).toBeLessThan(0);
    expect(compareSemver("1.3.0", "1.2.9")).toBeGreaterThan(0);
  });
});

describe("latestStableVersion", () => {
  it("returns the highest stable release tag", () => {
    expect(latestStableVersion(sampleTags)).toBe("1.2.3");
  });
});

describe("activeRcBase", () => {
  it("returns the highest rc base", () => {
    expect(activeRcBase(sampleTags)).toBe("1.3.0");
    expect(activeRcBase(["docker-api-v1.3.0-canary.4"])).toBe("");
  });
});

describe("activePrereleaseBase", () => {
  it("returns the highest prerelease base", () => {
    expect(activePrereleaseBase(sampleTags)).toBe("1.3.0");
  });
});

describe("nextCanaryNumber", () => {
  it("increments from existing canary tags for the same base", () => {
    expect(nextCanaryNumber(sampleTags, "1.3.0")).toBe(5);
    expect(nextCanaryNumber(sampleTags, "1.2.3")).toBe(1);
  });
});

describe("formatDockerVersion", () => {
  it("adds v prefix", () => {
    expect(formatDockerVersion("1.2.3")).toBe("v1.2.3");
    expect(formatDockerVersion("v1.3.0-rc.1")).toBe("v1.3.0-rc.1");
    expect(formatDockerVersion("1.3.0-canary.5")).toBe("v1.3.0-canary.5");
  });
});

describe("incPatch", () => {
  it("bumps patch segment", () => {
    expect(incPatch("1.2.3")).toBe("1.2.4");
  });
});

describe("resolveCanaryVersion", () => {
  it("continues an active prerelease line per service", () => {
    const resolved = resolveCanaryVersion({ tags: sampleTags });
    expect(resolved.api.base).toBe("1.3.0");
    expect(resolved.api.number).toBe(5);
    expect(resolved.api.version).toBe("v1.3.0-canary.5");
    expect(resolved.web.base).toBe("1.3.0");
    expect(resolved.web.number).toBe(5);
    expect(resolved.web.version).toBe("v1.3.0-canary.5");
    expect(resolved.dockerTagApi).toBe("docker-api-v1.3.0-canary.5");
    expect(resolved.dockerTagWeb).toBe("docker-web-v1.3.0-canary.5");
  });

  it("seeds from 0.0.1 when no tags exist", () => {
    const resolved = resolveCanaryVersion({ tags: [] });
    expect(resolved.api.base).toBe("0.0.1");
    expect(resolved.api.number).toBe(1);
    expect(resolved.api.version).toBe("v0.0.1-canary.1");
    expect(resolved.web.base).toBe("0.0.1");
    expect(resolved.web.number).toBe(1);
    expect(resolved.web.version).toBe("v0.0.1-canary.1");
  });

  it("bumps patch from latest stable when no active prerelease exists", () => {
    const resolved = resolveCanaryVersion({
      tags: ["docker-api-1.2.3", "docker-web-1.2.3"],
    });
    expect(resolved.api.base).toBe("1.2.4");
    expect(resolved.api.version).toBe("v1.2.4-canary.1");
    expect(resolved.web.base).toBe("1.2.4");
    expect(resolved.web.version).toBe("v1.2.4-canary.1");
  });

  it("bumps each service from its own latest stable tag", () => {
    const resolved = resolveCanaryVersion({
      tags: ["docker-api-0.0.16", "docker-web-0.0.17"],
    });
    expect(resolved.api.base).toBe("0.0.17");
    expect(resolved.api.version).toBe("v0.0.17-canary.1");
    expect(resolved.web.base).toBe("0.0.18");
    expect(resolved.web.version).toBe("v0.0.18-canary.1");
    expect(resolved.dockerTagApi).toBe("docker-api-v0.0.17-canary.1");
    expect(resolved.dockerTagWeb).toBe("docker-web-v0.0.18-canary.1");
  });

  it("continues canary numbering independently per service", () => {
    const resolved = resolveCanaryVersion({
      tags: [
        "docker-api-0.0.16",
        "docker-api-v0.0.17-canary.3",
        "docker-web-0.0.17",
      ],
    });
    expect(resolved.api.version).toBe("v0.0.17-canary.4");
    expect(resolved.web.version).toBe("v0.0.18-canary.1");
  });

  it("ignores service tags when resolving canary version", () => {
    const resolved = resolveCanaryVersion({
      tags: ["service-api-9.9.9", "docker-api-1.2.3", "docker-web-1.2.3"],
    });
    expect(resolved.api.base).toBe("1.2.4");
    expect(resolved.web.base).toBe("1.2.4");
  });

  it("ignores stale canary bases ahead of stable patch bump", () => {
    const resolved = resolveCanaryVersion({
      tags: [
        "docker-api-0.0.16",
        "docker-api-v0.0.18-canary.10",
        "docker-web-0.0.17",
        "docker-web-v0.0.18-canary.10",
      ],
    });
    expect(resolved.api.version).toBe("v0.0.17-canary.1");
    expect(resolved.web.version).toBe("v0.0.18-canary.11");
  });
});
