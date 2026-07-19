import { loadEnvFiles } from "./load-env";
loadEnvFiles();

import { VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { resolveWatchPort } from "./lib/runtime-config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: false });
  app.use(cookieParser(process.env.SESSION_SECRET || "dev-secret"));
  const origin = process.env.WEB_ORIGIN || "http://localhost:3000";
  app.enableCors({
    origin: [origin, "http://localhost:3000"],
    credentials: true,
  });
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });
  const port = resolveWatchPort();
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`questorylabs-watch listening on :${port}`);
}

void bootstrap();
