import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const apiDir = path.join(root, "apps", "api");
const prismaDir = path.join(apiDir, "prisma");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(path.join(root, ".env"));
loadEnvFile(path.join(apiDir, ".env"));

export function resolveDbProvider() {
  const explicit = (process.env.DATABASE_PROVIDER || "").toLowerCase().trim();
  if (explicit === "sqlite" || explicit === "sqlite3") return "sqlite";
  if (explicit === "postgres" || explicit === "postgresql") return "postgresql";

  const url = process.env.DATABASE_URL || "";
  if (url.startsWith("file:")) return "sqlite";
  if (
    url.startsWith("postgres://") ||
    url.startsWith("postgresql://")
  ) {
    return "postgresql";
  }

  return "sqlite";
}

const provider = resolveDbProvider();
const templatePath = path.join(prismaDir, "schema.template.prisma");
const outPath = path.join(prismaDir, "schema.prisma");

if (!fs.existsSync(templatePath)) {
  console.error(`Missing Prisma template: ${templatePath}`);
  process.exit(1);
}

const template = fs.readFileSync(templatePath, "utf8");
const schema = template.replaceAll("__PRISMA_PROVIDER__", provider);
fs.writeFileSync(outPath, schema, "utf8");

console.log(
  `[prisma] provider=${provider} (DATABASE_PROVIDER=${process.env.DATABASE_PROVIDER || "auto"}, DATABASE_URL=${process.env.DATABASE_URL ? "set" : "unset"})`,
);
