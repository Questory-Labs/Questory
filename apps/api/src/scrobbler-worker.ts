import { NestFactory } from "@nestjs/core";
import { loadEnvFiles } from "./load-env";
import { assertModeConfig } from "./lib/runtime-config";
import { ScrobblerWorkerModule } from "./scrobbler-worker.module";

process.env.PROCESS_ROLE = "scrobbler";
loadEnvFiles();
assertModeConfig();

async function bootstrap() {
  await NestFactory.createApplicationContext(ScrobblerWorkerModule);
  console.log("Scrobbler worker running (PROCESS_ROLE=scrobbler)");
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
