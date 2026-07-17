import { NestFactory } from "@nestjs/core";
import { loadEnvFiles } from "./load-env";
import { isCronEnabled } from "./cron-enabled";
import { AppModule } from "./app.module";

loadEnvFiles();

async function bootstrap() {
  if (!isCronEnabled()) {
    console.log(
      "Cron disabled (set CRON_ENABLED=true|TRUE|1 to enable). Exiting.",
    );
    process.exit(0);
  }

  const secret = (process.env.CRON_SECRET || "").trim();
  if (!secret) {
    console.error("CRON_ENABLED is set but CRON_SECRET is missing. Exiting.");
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["log", "error", "warn"],
  });

  app.enableShutdownHooks();

  const apiUrl =
    process.env.API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:4000";
  console.log(`Cron scheduler running → API ${apiUrl}`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
