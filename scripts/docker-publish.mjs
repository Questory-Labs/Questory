import { spawnSync } from "node:child_process";

/**
 * Build and push questorylabs-{api,web} images to Docker Hub and optionally GHCR.
 *
 * Usage:
 *   docker login
 *   # optional GHCR: echo $GITHUB_TOKEN | docker login ghcr.io -u USER --password-stdin
 *   pnpm docker:publish
 *   IMAGE_TAG=0.1.0 pnpm docker:publish
 *   DOCKERHUB_NAMESPACE=myuser pnpm docker:publish
 *   GHCR_NAMESPACE=questory-labs pnpm docker:publish  # also tag/push ghcr.io/...
 *   pnpm docker:publish -- --no-push          # build + tag only
 *   pnpm docker:publish -- api web            # subset of images
 */

const dockerhubNamespace = process.env.DOCKERHUB_NAMESPACE || "santoshpanna";
const ghcrNamespace = (process.env.GHCR_NAMESPACE || "").toLowerCase();
const prefix = process.env.DOCKER_IMAGE_PREFIX || "questorylabs";
const tag = process.env.IMAGE_TAG || "latest";
const sourceRepo = process.env.DOCKER_IMAGE_SOURCE || "";
const nextPublicApiUrl =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const nextPublicEnableMusic = process.env.NEXT_PUBLIC_ENABLE_MUSIC || "false";
const nextPublicEnableWatch = process.env.NEXT_PUBLIC_ENABLE_WATCH || "false";

const allImages = {
  api: {
    dockerfile: "apps/api/Dockerfile",
    buildArgs: ["DATABASE_PROVIDER=postgresql"],
  },
  web: {
    dockerfile: "apps/web/Dockerfile",
    buildArgs: [
      `NEXT_PUBLIC_API_URL=${nextPublicApiUrl}`,
      `NEXT_PUBLIC_ENABLE_MUSIC=${nextPublicEnableMusic}`,
      `NEXT_PUBLIC_ENABLE_WATCH=${nextPublicEnableWatch}`,
    ],
  },
};

const argv = process.argv.slice(2);
const noPush = argv.includes("--no-push");
const requested = argv.filter((a) => !a.startsWith("--"));
const names = requested.length > 0 ? requested : Object.keys(allImages);

for (const name of names) {
  if (!allImages[name]) {
    console.error(
      `Unknown image "${name}". Expected one of: ${Object.keys(allImages).join(", ")}`,
    );
    process.exit(1);
  }
}

function registries() {
  const list = [{ host: "docker.io", namespace: dockerhubNamespace }];
  if (ghcrNamespace) {
    list.push({ host: "ghcr.io", namespace: ghcrNamespace });
  }
  return list;
}

function imageRef(registry, name, imageTag = tag) {
  const path = `${registry.namespace}/${prefix}-${name}:${imageTag}`;
  return registry.host === "docker.io" ? path : `${registry.host}/${path}`;
}

function allRefs(name, imageTag = tag) {
  return registries().map((r) => imageRef(r, name, imageTag));
}

function run(cmd, args) {
  console.log(`\n> ${cmd} ${args.join(" ")}\n`);
  const result = spawnSync(cmd, args, { stdio: "inherit", shell: true });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function buildCacheDir(name) {
  const toolCache = process.env.RUNNER_TOOL_CACHE || "/tmp/gha-tool-cache";
  const cacheRoot =
    process.env.DOCKER_BUILDX_CACHE_DIR || `${toolCache}/docker-buildx`;
  return `${cacheRoot}/${name}`;
}

function buildImage(name, dockerfile, buildArgs, tags) {
  const cacheDir = buildCacheDir(name);
  run("mkdir", ["-p", cacheDir]);

  const useBuildx =
    process.env.DOCKER_BUILDX !== "0" &&
    (process.env.CI === "true" || process.env.DOCKER_BUILDX_CACHE_DIR);

  const args = useBuildx ? ["buildx", "build", "--load"] : ["build"];
  args.push("-f", dockerfile);

  for (const t of tags) {
    args.push("-t", t);
  }
  for (const arg of buildArgs) {
    args.push("--build-arg", arg);
  }
  if (sourceRepo) {
    args.push("--label", `org.opencontainers.image.source=${sourceRepo}`);
  }
  if (useBuildx) {
    args.push("--cache-from", `type=local,src=${cacheDir}`);
    args.push("--cache-to", `type=local,dest=${cacheDir},mode=max`);
  }
  args.push(".");
  run("docker", args);
}

for (const name of names) {
  const { dockerfile, buildArgs } = allImages[name];
  const tags = allRefs(name);
  if (tag !== "latest") {
    tags.push(...allRefs(name, "latest"));
  }

  buildImage(name, dockerfile, buildArgs, tags);

  if (!noPush) {
    for (const t of tags) {
      run("docker", ["push", t]);
    }
  }
}

const published = names.flatMap((n) => allRefs(n));
console.log(`\nDone. Images: ${published.join(", ")}`);
if (noPush) {
  console.log("Skipped push (--no-push).");
}
