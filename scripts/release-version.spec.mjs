import { describe, expect, it } from "vitest";
import {
  activePrereleaseBase,
  compareSemver,
  formatDockerVersion,
  incPatch,
  latestStableVersion,
  nextCanaryNumber,
  parseSemver,
  resolveCanaryVersion,
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
  it("continues an active prerelease line", () => {
    const resolved = resolveCanaryVersion({ tags: sampleTags });
    expect(resolved.base).toBe("1.3.0");
    expect(resolved.number).toBe(5);
    expect(resolved.version).toBe("v1.3.0-canary.5");
    expect(resolved.dockerTagApi).toBe("docker-api-v1.3.0-canary.5");
    expect(resolved.dockerTagWeb).toBe("docker-web-v1.3.0-canary.5");
  });

  it("seeds from 0.0.1 when no tags exist", () => {
    const resolved = resolveCanaryVersion({ tags: [] });
    expect(resolved.base).toBe("0.0.1");
    expect(resolved.number).toBe(1);
    expect(resolved.version).toBe("v0.0.1-canary.1");
  });

  it("bumps patch from latest stable when no active prerelease exists", () => {
    const resolved = resolveCanaryVersion({
      tags: ["docker-api-1.2.3", "docker-web-1.2.3"],
    });
    expect(resolved.base).toBe("1.2.4");
    expect(resolved.version).toBe("v1.2.4-canary.1");
  });

  it("ignores service tags when resolving canary version", () => {
    const resolved = resolveCanaryVersion({
      tags: ["service-api-9.9.9", "docker-api-1.2.3", "docker-web-1.2.3"],
    });
    expect(resolved.base).toBe("1.2.4");
  });
});
