import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  cargoArgs,
  cargoTomlPath,
  enterpriseDir,
  preflight,
} from "./dev-enterprise.lib.mjs";

describe("enterpriseDir", () => {
  it("resolves enterprise/ under the repo root", () => {
    expect(enterpriseDir("/repo")).toBe(join("/repo", "enterprise"));
  });
});

describe("cargoTomlPath", () => {
  it("points at Cargo.toml in the enterprise dir", () => {
    expect(cargoTomlPath(join("/repo", "enterprise"))).toBe(
      join("/repo", "enterprise", "Cargo.toml"),
    );
  });
});

describe("cargoArgs", () => {
  it("runs cargo with no extra flags by default", () => {
    expect(cargoArgs()).toEqual(["run"]);
  });

  it("forwards extra cargo arguments", () => {
    expect(cargoArgs(["--release", "--", "--version"])).toEqual([
      "run",
      "--release",
      "--",
      "--version",
    ]);
  });
});

describe("preflight", () => {
  it("fails when the private crate is not mounted", () => {
    const result = preflight({ cargoTomlExists: false, cargoAvailable: true });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/enterprise\//);
  });

  it("fails when cargo is missing", () => {
    const result = preflight({ cargoTomlExists: true, cargoAvailable: false });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/cargo/);
  });

  it("passes when the crate and cargo are present", () => {
    expect(preflight({ cargoTomlExists: true, cargoAvailable: true })).toEqual({
      ok: true,
    });
  });
});
