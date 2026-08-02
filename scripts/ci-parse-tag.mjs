import { appendFileSync } from "node:fs";

/**
 * Parse release tags:
 *   docker-api-1.2.3           → kind=docker  service=api  version=1.2.3  channel=stable
 *   docker-api-1.3.0-rc.1      → channel=rc
 *   docker-api-0.0.0-canary.*  → channel=canary
 *   docker-api-canary          → channel=canary (requires CANARY_VERSION env)
 *   service-web-0.1.0          → kind=service service=web  version=0.1.0
 *
 * Optional leading v on the version is stripped (docker-api-v1.0.0 → 1.0.0).
 *
 * Set CHANNEL_OVERRIDE to stable|rc|canary to validate against the parsed channel
 * (used by Manual Release). Use "auto" or omit to accept the detected channel.
 */

const TAG_PATTERN =
  /^(docker|service)-(api|web)-v?(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.+-]+)?)$/;
const CANARY_TAG_PATTERN = /^(docker|service)-(api|web)-canary$/;

/**
 * @param {string} version
 * @returns {"stable" | "rc" | "canary"}
 */
export function detectChannel(version) {
  const prerelease = version.match(/^\d+\.\d+\.\d+-([0-9A-Za-z.+-]+)$/)?.[1];
  if (!prerelease) {
    return "stable";
  }
  if (prerelease.startsWith("canary.")) {
    return "canary";
  }
  if (prerelease.startsWith("rc.")) {
    return "rc";
  }
  return "rc";
}

/**
 * @param {"stable" | "rc" | "canary"} channel
 * @returns {string[]}
 */
export function channelExtraTags(channel) {
  switch (channel) {
    case "stable":
      return ["stable", "latest"];
    case "rc":
      return ["rc"];
    case "canary":
      return ["canary"];
    default:
      throw new Error(`Unknown channel: ${channel}`);
  }
}

/**
 * @param {string} tag
 * @param {{ canaryVersion?: string, channelOverride?: string }} [options]
 */
export function parseReleaseTag(tag, options = {}) {
  const normalized = (tag || "").replace(/^refs\/tags\//, "");
  const canaryVersion =
    options.canaryVersion ?? process.env.CANARY_VERSION ?? "";

  let kind;
  let service;
  let version;

  const canaryMatch = normalized.match(CANARY_TAG_PATTERN);
  if (canaryMatch) {
    [, kind, service] = canaryMatch;
    if (!canaryVersion) {
      throw new Error(
        `Tag "${normalized}" requires CANARY_VERSION (e.g. 0.0.0-canary.20250802.abc1234)`,
      );
    }
    version = canaryVersion;
  } else {
    const match = normalized.match(TAG_PATTERN);
    if (!match) {
      throw new Error(
        `Invalid tag "${normalized}". Expected docker|service-<api|web>-<semver> or docker|service-<api|web>-canary`,
      );
    }
    [, kind, service, version] = match;
  }

  const detectedChannel = detectChannel(version);
  const override = (
    options.channelOverride ??
    process.env.CHANNEL_OVERRIDE ??
    "auto"
  ).toLowerCase();

  let channel = detectedChannel;
  if (override !== "auto") {
    if (!["stable", "rc", "canary"].includes(override)) {
      throw new Error(
        `Invalid CHANNEL_OVERRIDE "${override}". Expected auto|stable|rc|canary`,
      );
    }
    if (override !== detectedChannel) {
      throw new Error(
        `Channel override "${override}" does not match version-derived channel "${detectedChannel}" for version "${version}"`,
      );
    }
    channel = override;
  }

  const prefix = process.env.DOCKER_IMAGE_PREFIX || "questorylabs";
  const namespace = process.env.DOCKERHUB_NAMESPACE || "santoshpanna";
  const ghcrNamespace = (
    process.env.GHCR_NAMESPACE || "questory-labs"
  ).toLowerCase();
  const image = `${namespace}/${prefix}-${service}`;
  const ghcrImage = `ghcr.io/${ghcrNamespace}/${prefix}-${service}`;
  const extraTags = channelExtraTags(channel);
  const allTags = [version, ...extraTags];

  return {
    tag: normalized,
    kind,
    service,
    version,
    channel,
    image,
    image_tag: `${image}:${version}`,
    image_latest: channel === "stable" ? `${image}:latest` : "",
    image_tags: allTags.map((t) => `${image}:${t}`).join(","),
    image_extra_tags: extraTags.join(","),
    ghcr_image: ghcrImage,
    ghcr_image_tag: `${ghcrImage}:${version}`,
    ghcr_image_latest: channel === "stable" ? `${ghcrImage}:latest` : "",
    ghcr_image_tags: allTags.map((t) => `${ghcrImage}:${t}`).join(","),
    ghcr_image_extra_tags: extraTags.join(","),
    package: `@questorylabs/${service}`,
  };
}

function main() {
  const tag = process.argv[2] || process.env.GITHUB_REF_NAME || "";

  let outputs;
  try {
    outputs = parseReleaseTag(tag);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  const outFile = process.env.GITHUB_OUTPUT;
  if (outFile) {
    for (const [k, v] of Object.entries(outputs)) {
      appendFileSync(outFile, `${k}=${v}\n`);
    }
  }

  for (const [k, v] of Object.entries(outputs)) {
    console.log(`${k}=${v}`);
  }
}

const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith("ci-parse-tag.mjs") ||
    process.argv[1].includes("ci-parse-tag"));

if (isMain) {
  main();
}
