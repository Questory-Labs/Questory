import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { INestApplication, VersioningType } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { HealthController } from "../src/health.controller";

describe("GET /health", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
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

  it("returns liveness and feature flags without infra details", async () => {
    const res = await request(app.getHttpServer()).get("/health").expect(200);
    expect(res.body).toEqual({
      ok: true,
      service: "questorylabs-api",
      music: { enabled: true },
      watch: { enabled: true },
      read: { enabled: true },
    });
  });
});
