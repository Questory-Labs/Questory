import { appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

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
 * @returns {{ service: "api" | "web", base: string, channel?: "rc" | "canary", number?: number } | null}
 */
export function parseReleaseTagVersion(tag) {
  const normalized = (tag || "").replace(/^refs\/tags\//, "");
  const match = normalized.match(DOCKER_RELEASE_TAG_PATTERN);
  if (!match) {
    return null;
  }
  const [, service, base, channel, number] = match;
  if (!channel) {
    return { service, base };
  }
  return { service, base, channel, number: Number(number) };
}

/**
 * @param {"api" | "web"} service
 * @returns {string}
 */
export function stableTagPattern(service) {
  return `refs/tags/docker-${service}-[0-9]*.[0-9]*.[0-9]*`;
}

/**
 * @param {"api" | "web"} service
 * @returns {string}
 */
export function rcTagPattern(service) {
  return `refs/tags/docker-${service}-*-rc.*`;
}

/**
 * @param {"api" | "web"} service
 * @param {string} base
 * @returns {string[]}
 */
export function canaryTagPatterns(service, base) {
  return [
    `refs/tags/docker-${service}-v${base}-canary.*`,
    `refs/tags/docker-${service}-${base}-canary.*`,
  ];
}

/**
 * Return the highest version-sorted tag for one or more refs/tags patterns.
 * Uses `git for-each-ref --count=1` so git never materializes the full tag list.
 *
 * @param {string[]} patterns
 * @returns {string}
 */
export function gitHighestTag(patterns) {
  if (patterns.length === 0) {
    return "";
  }
  try {
    const output = execFileSync(
      "git",
      [
        "for-each-ref",
        "--count=1",
        "--sort=-v:refname",
        "--format=%(refname:short)",
        ...patterns,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    return output.split(/\r?\n/).find(Boolean) ?? "";
  } catch {
    return "";
  }
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
export function activeRcBase(tags) {
  let latest = "";
  for (const tag of tags) {
    const parsed = parseReleaseTagVersion(tag);
    if (!parsed || parsed.channel !== "rc") {
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
 * @param {string[]} tags
 * @param {"api" | "web"} service
 */
export function aggregateServiceReleaseState(tags, service) {
  let latestStable = "";
  let rcBase = "";
  /** @type {Map<string, number>} */
  const canaryMaxByBase = new Map();

  for (const tag of tags) {
    const parsed = parseReleaseTagVersion(tag);
    if (!parsed || parsed.service !== service) {
      continue;
    }

    if (!parsed.channel) {
      if (!latestStable || compareSemver(parsed.base, latestStable) > 0) {
        latestStable = parsed.base;
      }
      continue;
    }

    if (parsed.channel === "rc") {
      if (!rcBase || compareSemver(parsed.base, rcBase) > 0) {
        rcBase = parsed.base;
      }
      continue;
    }

    const current = canaryMaxByBase.get(parsed.base) ?? 0;
    canaryMaxByBase.set(parsed.base, Math.max(current, parsed.number ?? 0));
  }

  return { latestStable, rcBase, canaryMaxByBase };
}

/**
 * @param {string} latestStable
 * @param {string} rcBase
 * @returns {string}
 */
export function resolveCanaryBase(latestStable, rcBase) {
  let base;
  if (latestStable) {
    base = incPatch(latestStable);
  } else {
    base = DEFAULT_SEED;
  }

  if (rcBase && compareSemver(rcBase, base) > 0) {
    base = rcBase;
  }

  return base;
}

/**
 * @param {"api" | "web"} service
 * @returns {string}
 */
export function readLatestStableFromGit(service) {
  const tag = gitHighestTag([stableTagPattern(service)]);
  const parsed = parseReleaseTagVersion(tag);
  return parsed?.service === service && !parsed.channel ? parsed.base : "";
}

/**
 * @param {"api" | "web"} service
 * @returns {string}
 */
export function readRcBaseFromGit(service) {
  const tag = gitHighestTag([rcTagPattern(service)]);
  const parsed = parseReleaseTagVersion(tag);
  return parsed?.service === service && parsed.channel === "rc" ? parsed.base : "";
}

/**
 * @param {"api" | "web"} service
 * @param {string} base
 * @returns {number}
 */
export function readHighestCanaryNumberFromGit(service, base) {
  const tag = gitHighestTag(canaryTagPatterns(service, base));
  const parsed = parseReleaseTagVersion(tag);
  if (parsed?.service !== service || parsed.channel !== "canary" || parsed.base !== base) {
    return 0;
  }
  return parsed.number ?? 0;
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
 * @param {"api" | "web"} service
 * @param {{ tags?: string[], runFallback?: number }} [options]
 */
export function resolveServiceCanaryVersion(service, options = {}) {
  const { tags, runFallback } = options;

  let latestStable;
  let rcBase;
  /** @type {Map<string, number> | null} */
  let canaryMaxByBase = null;

  if (tags) {
    const state = aggregateServiceReleaseState(tags, service);
    latestStable = state.latestStable;
    rcBase = state.rcBase;
    canaryMaxByBase = state.canaryMaxByBase;
  } else {
    latestStable = readLatestStableFromGit(service);
    rcBase = readRcBaseFromGit(service);
  }

  const base = resolveCanaryBase(latestStable, rcBase);
  let number = canaryMaxByBase
    ? (canaryMaxByBase.get(base) ?? 0) + 1
    : readHighestCanaryNumberFromGit(service, base) + 1;

  if (number === 1 && runFallback && runFallback > 1) {
    number = runFallback;
  }

  const version = formatDockerVersion(`${base}-canary.${number}`);
  const releaseSuffix = version.replace(/^v/, "");

  return {
    service,
    base,
    number,
    version,
    dockerTag: `docker-${service}-v${releaseSuffix}`,
  };
}

/**
 * @param {{ tags?: string[], runFallback?: number }} [options]
 */
export function resolveCanaryVersion(options = {}) {
  const runFallback =
    options.runFallback ??
    (Number(process.env.GITHUB_RUN_NUMBER || 0) || undefined);

  const serviceOptions = { tags: options.tags, runFallback };
  const api = resolveServiceCanaryVersion("api", serviceOptions);
  const web = resolveServiceCanaryVersion("web", serviceOptions);

  return {
    api,
    web,
    versionApi: api.version,
    versionWeb: web.version,
    dockerTagApi: api.dockerTag,
    dockerTagWeb: web.dockerTag,
  };
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

  const resolved = resolveCanaryVersion();

  if (useGithubOutput) {
    writeGithubOutput({
      version_api: resolved.versionApi,
      version_web: resolved.versionWeb,
      base_api: resolved.api.base,
      base_web: resolved.web.base,
      number_api: String(resolved.api.number),
      number_web: String(resolved.web.number),
      docker_tag_api: resolved.dockerTagApi,
      docker_tag_web: resolved.dockerTagWeb,
    });
  }

  for (const [key, value] of Object.entries({
    version_api: resolved.versionApi,
    version_web: resolved.versionWeb,
    base_api: resolved.api.base,
    base_web: resolved.web.base,
    number_api: resolved.api.number,
    number_web: resolved.web.number,
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
