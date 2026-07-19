import { VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { loadEnvFiles } from "./load-env";
import { AppModule } from "./app.module";
import {
  assertModeConfig,
  isAllowlistEnabled,
  resolveAppMode,
  resolveDbProvider,
  resolveSyncMode,
} from "./lib/runtime-config";

loadEnvFiles();
assertModeConfig();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Keep dotted OpenID keys like openid.claimed_id flat (not nested by qs)
  const http = app.getHttpAdapter().getInstance();
  if (typeof http?.set === "function") {
    http.set("query parser", "simple");
    const trustProxy = (process.env.TRUST_PROXY || "").trim().toLowerCase();
    if (trustProxy === "1" || trustProxy === "true" || trustProxy === "yes") {
      http.set("trust proxy", 1);
    }
  }
  app.use(cookieParser(process.env.SESSION_SECRET || "dev-secret"));
  app.enableCors({
    origin: process.env.WEB_ORIGIN || "http://localhost:3000",
    credentials: true,
  });
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });
  const port = Number(process.env.API_PORT || 4000);
  await app.listen(port);
  const mode = resolveAppMode();
  console.log(`API listening on http://localhost:${port}`);
  console.log(
    `APP_MODE=${mode} · DB=${resolveDbProvider()} · sync=${resolveSyncMode()} · Steam key: ${process.env.STEAM_API_KEY ? "loaded" : "MISSING"} · allowlist: ${isAllowlistEnabled() ? "on" : "off"}`,
  );
}

bootstrap();
