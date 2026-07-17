import { spawnSync } from "node:child_process";

const profile = process.argv[2];
const extraArgs = process.argv.slice(3);

if (!profile) {
  console.error(
    "Usage: node scripts/docker-profile.mjs <selfhosted|selfhosted-full|production|infra> [...docker compose args]",
  );
  process.exit(1);
}

const defaults = {
  selfhosted: "selfhosted",
  "selfhosted-full": "selfhosted-full",
  production: "production",
};

const env = { ...process.env };
if (!env.APP_MODE && defaults[profile]) {
  env.APP_MODE = defaults[profile];
}

// Prefer Hub images when present; build only if missing (or pass --build).
// Examples:
//   pnpm docker:selfhosted
//   pnpm docker:selfhosted -- --build
//   PULL_POLICY=always pnpm docker:selfhosted
const args =
  profile === "infra"
    ? ["compose", "--profile", "infra", "up", "-d", "postgres", "redis", ...extraArgs]
    : [
        "compose",
        "--profile",
        profile,
        "up",
        "-d",
        "--pull",
        "missing",
        ...extraArgs,
      ];

const result = spawnSync("docker", args, {
  stdio: "inherit",
  env,
  shell: true,
});

process.exit(result.status ?? 1);
