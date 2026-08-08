import { describe, expect, it } from "vitest";
import {
  channelExtraTags,
  detectChannel,
  parseReleaseTag,
} from "./ci-parse-tag.mjs";

describe("detectChannel", () => {
  it("returns stable for release semver", () => {
    expect(detectChannel("1.2.3")).toBe("stable");
    expect(detectChannel("v1.2.3")).toBe("stable");
  });

  it("returns rc for rc prerelease", () => {
    expect(detectChannel("1.3.0-rc.1")).toBe("rc");
    expect(detectChannel("v1.3.0-rc.1")).toBe("rc");
  });

  it("returns canary for canary prerelease", () => {
    expect(detectChannel("1.3.0-canary.5")).toBe("canary");
    expect(detectChannel("v1.3.0-canary.5")).toBe("canary");
  });

  it("returns rc for other prerelease identifiers", () => {
    expect(detectChannel("1.0.0-beta.1")).toBe("rc");
  });
});

describe("channelExtraTags", () => {
  it("maps stable to stable and latest", () => {
    expect(channelExtraTags("stable")).toEqual(["stable", "latest"]);
  });

  it("maps rc to rc only", () => {
    expect(channelExtraTags("rc")).toEqual(["rc"]);
  });

  it("maps canary to canary only", () => {
    expect(channelExtraTags("canary")).toEqual(["canary"]);
  });
});

describe("parseReleaseTag", () => {
  it("parses stable docker-api tag with v-prefixed docker version", () => {
    const result = parseReleaseTag("docker-api-1.2.3");
    expect(result.channel).toBe("stable");
    expect(result.version).toBe("v1.2.3");
    expect(result.image_extra_tags).toBe("stable,latest");
    expect(result.image_latest).toBe("santoshpanna/questorylabs-api:latest");
    expect(result.ghcr_image_latest).toBe(
      "ghcr.io/questory-labs/questorylabs-api:latest",
    );
    expect(result.image_tags).toContain("santoshpanna/questorylabs-api:v1.2.3");
  });

  it("parses rc docker-web tag without latest", () => {
    const result = parseReleaseTag("docker-web-1.3.0-rc.1");
    expect(result.channel).toBe("rc");
    expect(result.version).toBe("v1.3.0-rc.1");
    expect(result.image_extra_tags).toBe("rc");
    expect(result.image_latest).toBe("");
    expect(result.image_tags).toContain("santoshpanna/questorylabs-web:rc");
    expect(result.image_tags).toContain(
      "santoshpanna/questorylabs-web:v1.3.0-rc.1",
    );
  });

  it("parses canary semver tag", () => {
    const result = parseReleaseTag("docker-api-v1.3.0-canary.2");
    expect(result.channel).toBe("canary");
    expect(result.version).toBe("v1.3.0-canary.2");
    expect(result.image_extra_tags).toBe("canary");
    expect(result.image_latest).toBe("");
    expect(result.image_tags).toContain("santoshpanna/questorylabs-api:canary");
    expect(result.image_tags).toContain(
      "santoshpanna/questorylabs-api:v1.3.0-canary.2",
    );
  });

  it("strips leading v from git tag version", () => {
    const result = parseReleaseTag("docker-api-v1.0.0");
    expect(result.version).toBe("v1.0.0");
    expect(result.channel).toBe("stable");
  });

  it("parses service tags", () => {
    const result = parseReleaseTag("service-web-0.1.0");
    expect(result.kind).toBe("service");
    expect(result.service).toBe("web");
    expect(result.channel).toBe("stable");
    expect(result.version).toBe("v0.1.0");
  });

  it("rejects channel override mismatch", () => {
    expect(() =>
      parseReleaseTag("docker-api-1.2.3", { channelOverride: "rc" }),
    ).toThrow(/does not match/);
  });

  it("accepts matching channel override", () => {
    const result = parseReleaseTag("docker-api-1.3.0-rc.1", {
      channelOverride: "rc",
    });
    expect(result.channel).toBe("rc");
  });

  it("rejects invalid tags", () => {
    expect(() => parseReleaseTag("docker-api-canary")).toThrow(/Invalid tag/);
    expect(() => parseReleaseTag("bad-tag")).toThrow(/Invalid tag/);
  });
});
