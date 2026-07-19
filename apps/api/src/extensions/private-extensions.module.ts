import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { DynamicModule, Module, Type } from "@nestjs/common";

const nodeRequire = createRequire(__filename);

function resolvePrivateExtensionEntry(): string | null {
  const roots = [
    resolve(process.cwd(), "../../enterprise"),
    resolve(__dirname, "../../../../enterprise"),
  ];

  for (const root of roots) {
    const entry = join(root, "dist", "index.js");
    if (existsSync(entry)) return entry;
  }

  return null;
}

function loadPrivateExtensionModule(): Type<unknown> | null {
  const disabled = (process.env.PRIVATE_EXTENSIONS || "").trim().toLowerCase();
  if (disabled === "0" || disabled === "false" || disabled === "off") {
    return null;
  }

  const entry = resolvePrivateExtensionEntry();
  if (!entry) return null;

  try {
    const loaded = nodeRequire(entry) as {
      ApiExtensionModule?: Type<unknown>;
      default?: Type<unknown>;
    };
    return loaded.ApiExtensionModule ?? loaded.default ?? null;
  } catch {
    return null;
  }
}

@Module({})
export class PrivateExtensionsModule {
  static forRoot(): DynamicModule {
    const extension = loadPrivateExtensionModule();
    return {
      module: PrivateExtensionsModule,
      imports: extension ? [extension] : [],
    };
  }
}
