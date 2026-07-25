import { appendFileSync } from "node:fs";

/**
 * Parse release tags:
 *   docker-api-1.2.3  → kind=docker  service=api  version=1.2.3
 *   service-web-0.1.0 → kind=service service=web  version=0.1.0
 *
 * Optional leading v on the version is stripped (docker-api-v1.0.0 → 1.0.0).
 */

const tag = (process.argv[2] || process.env.GITHUB_REF_NAME || "").replace(
  /^refs\/tags\//,
  "",
);

const match = tag.match(
  /^(docker|service)-(api|web)-v?(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.+-]+)?)$/,
);

if (!match) {
  console.error(
    `Invalid tag "${tag}". Expected docker|service-<api|web>-<semver>`,
  );
  process.exit(1);
}

const [, kind, service, version] = match;
const prefix = process.env.DOCKER_IMAGE_PREFIX || "questorylabs";
const namespace = process.env.DOCKERHUB_NAMESPACE || "santoshpanna";
const image = `${namespace}/${prefix}-${service}`;

const outputs = {
  kind,
  service,
  version,
  image,
  image_tag: `${image}:${version}`,
  image_latest: `${image}:latest`,
  package: `@questorylabs/${service}`,
};

const outFile = process.env.GITHUB_OUTPUT;
if (outFile) {
  for (const [k, v] of Object.entries(outputs)) {
    appendFileSync(outFile, `${k}=${v}\n`);
  }
}

for (const [k, v] of Object.entries(outputs)) {
  console.log(`${k}=${v}`);
}
