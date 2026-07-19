import { VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { loadEnvFiles } from "./load-env";
import { AppModule } from "./app.module";
import { resolveAppMode, resolveDbProvider } from "./lib/runtime-config";

loadEnvFiles();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
  const port = Number(process.env.MUSIC_PORT || 4010);
  await app.listen(port);
  console.log(`Music listening on http://localhost:${port}`);
  console.log(`APP_MODE=${resolveAppMode()} · DB=${resolveDbProvider()}`);
}

bootstrap();
