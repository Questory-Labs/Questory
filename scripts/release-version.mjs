import { appendFileSync } from "node:fs";
import { execSync } from "node:child_process";

const DOCKER_RELEASE_TAG_PATTERN =
  /^docker-(api|web)-v?(\d+\.\d+\.\d+)(?:-(rc|canary)\.(\d+))?$/;

const DEFAULT_SEED = "0.0.1";

/**
 * @param {string} str
 * @returns {{ major: number, minor: number, patch: number, raw: string }}
 */
export function parseSemver(str) {
  const normalized = (str || "").replace(/^v/i, "");
  const match = normalized.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid semver "${str}". Expected X.Y.Z`);
  }
  const [, major, minor, patch] = match;
  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    raw: `${major}.${minor}.${patch}`,
  };
}

/**
 * @param {{ major: number, minor: number, patch: number }} version
 * @returns {string}
 */
export function formatSemver(version) {
  return `${version.major}.${version.minor}.${version.patch}`;
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function compareSemver(a, b) {
  const left = parseSemver(a);
  const right = parseSemver(b);
  if (left.major !== right.major) return left.major - right.major;
  if (left.minor !== right.minor) return left.minor - right.minor;
  return left.patch - right.patch;
}

/**
 * @param {string} version
 * @returns {string}
 */
export function incPatch(version) {
  const parsed = parseSemver(version);
  return formatSemver({ ...parsed, patch: parsed.patch + 1 });
}

/**
 * @param {string} tag
 * @returns {{ base: string, channel?: "rc" | "canary", number?: number } | null}
 */
export function parseReleaseTagVersion(tag) {
  const normalized = (tag || "").replace(/^refs\/tags\//, "");
  const match = normalized.match(DOCKER_RELEASE_TAG_PATTERN);
  if (!match) {
    return null;
  }
  const [, , base, channel, number] = match;
  if (!channel) {
    return { base };
  }
  return { base, channel, number: Number(number) };
}

/**
 * @param {string[]} tags
 * @returns {string}
 */
export function latestStableVersion(tags) {
  let latest = "";
  for (const tag of tags) {
    const parsed = parseReleaseTagVersion(tag);
    if (!parsed || parsed.channel) {
      continue;
    }
    if (!latest || compareSemver(parsed.base, latest) > 0) {
      latest = parsed.base;
    }
  }
  return latest;
}

/**
 * @param {string[]} tags
 * @returns {string}
 */
export function activePrereleaseBase(tags) {
  let latest = "";
  for (const tag of tags) {
    const parsed = parseReleaseTagVersion(tag);
    if (!parsed?.channel) {
      continue;
    }
    if (!latest || compareSemver(parsed.base, latest) > 0) {
      latest = parsed.base;
    }
  }
  return latest;
}

/**
 * @param {string[]} tags
 * @param {string} base
 * @returns {number}
 */
export function nextCanaryNumber(tags, base) {
  let max = 0;
  for (const tag of tags) {
    const parsed = parseReleaseTagVersion(tag);
    if (!parsed || parsed.channel !== "canary" || parsed.base !== base) {
      continue;
    }
    max = Math.max(max, parsed.number ?? 0);
  }
  return max + 1;
}

/**
 * @param {string} version
 * @returns {string}
 */
export function formatDockerVersion(version) {
  const normalized = (version || "").replace(/^v/i, "");
  if (/^\d+\.\d+\.\d+(?:-(?:rc|canary)\.\d+)?$/.test(normalized)) {
    return `v${normalized}`;
  }
  throw new Error(`Invalid docker version "${version}"`);
}

/**
 * @param {{ tags?: string[], runFallback?: number }} [options]
 */
export function resolveCanaryVersion(options = {}) {
  const tags = options.tags ?? listGitTags();
  const latestStable = latestStableVersion(tags);
  const activeBase = activePrereleaseBase(tags);

  let base;
  if (activeBase && (!latestStable || compareSemver(activeBase, latestStable) > 0)) {
    base = activeBase;
  } else if (latestStable) {
    base = incPatch(latestStable);
  } else {
    base = DEFAULT_SEED;
  }

  let number = nextCanaryNumber(tags, base);
  if (number === 1 && options.runFallback && options.runFallback > 1) {
    number = options.runFallback;
  }

  const version = formatDockerVersion(`${base}-canary.${number}`);
  const releaseSuffix = version.replace(/^v/, "");

  return {
    base,
    number,
    version,
    dockerTagApi: `docker-api-v${releaseSuffix}`,
    dockerTagWeb: `docker-web-v${releaseSuffix}`,
  };
}

/**
 * @returns {string[]}
 */
export function listDockerReleaseTags() {
  try {
    const output = execSync('git tag -l "docker-api-*" "docker-web-*"', {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      shell: true,
    });
    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * @returns {string[]}
 */
export function listGitTags() {
  return listDockerReleaseTags();
}

function writeGithubOutput(outputs) {
  const outFile = process.env.GITHUB_OUTPUT;
  if (!outFile) {
    return;
  }
  for (const [key, value] of Object.entries(outputs)) {
    appendFileSync(outFile, `${key}=${value}\n`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const useGithubOutput = args.includes("--github-output");

  if (command !== "canary") {
    console.error(`Usage: node scripts/release-version.mjs canary [--github-output]`);
    process.exit(1);
  }

  const runFallback = Number(process.env.GITHUB_RUN_NUMBER || 0) || undefined;
  const resolved = resolveCanaryVersion({ runFallback });

  if (useGithubOutput) {
    writeGithubOutput({
      version: resolved.version,
      base: resolved.base,
      number: String(resolved.number),
      docker_tag_api: resolved.dockerTagApi,
      docker_tag_web: resolved.dockerTagWeb,
    });
  }

  for (const [key, value] of Object.entries({
    version: resolved.version,
    base: resolved.base,
    number: resolved.number,
    docker_tag_api: resolved.dockerTagApi,
    docker_tag_web: resolved.dockerTagWeb,
  })) {
    console.log(`${key}=${value}`);
  }
}

const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith("release-version.mjs") ||
    process.argv[1].includes("release-version"));

if (isMain) {
  main();
}
