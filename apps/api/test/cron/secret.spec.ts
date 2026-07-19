import { describe, expect, it, beforeAll, afterAll } from "vitest";
import {
  INestApplication,
  Controller,
  Post,
  UseGuards,
  VersioningType,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { CronSecretGuard } from "../../src/cron/cron-secret.guard";

@Controller("internal/cron")
@UseGuards(CronSecretGuard)
class ProbeCronController {
  @Post("ping")
  ping() {
    return { ok: true };
  }
}

describe("CronSecretGuard", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.CRON_SECRET = "cron-test-secret";
    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeCronController],
      providers: [CronSecretGuard],
    }).compile();
    app = moduleRef.createNestApplication();
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: "1",
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects missing secret", async () => {
    await request(app.getHttpServer())
      .post("/v1/internal/cron/ping")
      .expect(401);
  });

  it("rejects wrong secret", async () => {
    await request(app.getHttpServer())
      .post("/v1/internal/cron/ping")
      .set("Authorization", "Bearer wrong")
      .expect(401);
  });

  it("accepts Bearer secret", async () => {
    await request(app.getHttpServer())
      .post("/v1/internal/cron/ping")
      .set("Authorization", "Bearer cron-test-secret")
      .expect(201);
  });

  it("accepts x-cron-secret header", async () => {
    await request(app.getHttpServer())
      .post("/v1/internal/cron/ping")
      .set("x-cron-secret", "cron-test-secret")
      .expect(201);
  });

  it("ignores body-based auth", async () => {
    await request(app.getHttpServer())
      .post("/v1/internal/cron/ping")
      .send({ secret: "cron-test-secret" })
      .expect(401);
  });
});
