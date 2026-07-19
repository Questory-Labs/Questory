import { spawnSync } from "node:child_process";

/**
 * Build and push questorylabs-{api,web,cron,music} images to Docker Hub.
 *
 * Usage:
 *   docker login
 *   pnpm docker:publish
 *   IMAGE_TAG=0.1.0 pnpm docker:publish
 *   DOCKERHUB_NAMESPACE=myuser pnpm docker:publish
 *   pnpm docker:publish -- --no-push          # build + tag only
 *   pnpm docker:publish -- api web            # subset of images
 */

const namespace = process.env.DOCKERHUB_NAMESPACE || "santoshpanna";
const prefix = process.env.DOCKER_IMAGE_PREFIX || "questorylabs";
const tag = process.env.IMAGE_TAG || "latest";
const nextPublicApiUrl =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const nextPublicEnableMusic = process.env.NEXT_PUBLIC_ENABLE_MUSIC || "false";
const nextPublicMusicUrl =
  process.env.NEXT_PUBLIC_MUSIC_URL || "http://localhost:4010";

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
      `NEXT_PUBLIC_MUSIC_URL=${nextPublicMusicUrl}`,
    ],
  },
  cron: {
    dockerfile: "apps/cron/Dockerfile",
    buildArgs: [],
  },
  music: {
    dockerfile: "apps/music/Dockerfile",
    buildArgs: ["DATABASE_PROVIDER=postgresql"],
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

function imageRef(name, imageTag = tag) {
  return `${namespace}/${prefix}-${name}:${imageTag}`;
}

function run(cmd, args) {
  console.log(`\n> ${cmd} ${args.join(" ")}\n`);
  const result = spawnSync(cmd, args, { stdio: "inherit", shell: true });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

for (const name of names) {
  const { dockerfile, buildArgs } = allImages[name];
  const image = imageRef(name);
  const args = ["build", "-f", dockerfile, "-t", image];
  for (const arg of buildArgs) {
    args.push("--build-arg", arg);
  }
  // Also tag :latest when publishing a version tag
  if (tag !== "latest") {
    args.push("-t", imageRef(name, "latest"));
  }
  args.push(".");
  run("docker", args);

  if (!noPush) {
    run("docker", ["push", image]);
    if (tag !== "latest") {
      run("docker", ["push", imageRef(name, "latest")]);
    }
  }
}

console.log(`\nDone. Images: ${names.map((n) => imageRef(n)).join(", ")}`);
if (noPush) {
  console.log("Skipped push (--no-push).");
}
