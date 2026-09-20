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

  it("returns liveness only, without feature flags", async () => {
    const res = await request(app.getHttpServer()).get("/health").expect(200);
    expect(res.body).toEqual({
      ok: true,
      service: "questorylabs-api",
    });
    expect(res.body.music).toBeUndefined();
    expect(res.body.watch).toBeUndefined();
    expect(res.body.read).toBeUndefined();
  });
});
