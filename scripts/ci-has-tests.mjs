import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Exit 0 if the package has a test script.
 * Usage: node scripts/ci-has-tests.mjs <api|web|shared>
 */

const service = process.argv[2];
if (!service) {
  console.error("Usage: node scripts/ci-has-tests.mjs <api|web|shared>");
  process.exit(2);
}

const dir =
  service === "shared" ? join("packages", "shared") : join("apps", service);
const pkgPath = join(dir, "package.json");

if (!existsSync(pkgPath)) {
  console.log(`has_tests=false`);
  console.error(`No package at ${pkgPath}`);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const hasScript = Boolean(pkg.scripts?.test);

if (!hasScript) {
  console.log("has_tests=false");
  process.exit(1);
}

console.log("has_tests=true");
process.exit(0);
