import { join } from "node:path";

export function enterpriseDir(repoRoot) {
  return join(repoRoot, "enterprise");
}

export function cargoTomlPath(dir) {
  return join(dir, "Cargo.toml");
}

export function cargoArgs(extra = []) {
  return ["run", ...extra];
}

export function preflight({ cargoTomlExists, cargoAvailable }) {
  if (!cargoTomlExists) {
    return {
      ok: false,
      message:
        "QEngine sources are missing under enterprise/ (only README.md is tracked in the community tree). Clone the private mount, then retry.",
    };
  }
  if (!cargoAvailable) {
    return {
      ok: false,
      message:
        "cargo was not found on PATH. Install Rust (https://rustup.rs) and retry.",
    };
  }
  return { ok: true };
}
