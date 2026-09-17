import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import { INestApplication, VersioningType } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { EnterpriseProxyService } from "../../src/enterprise/enterprise-proxy.service";
import {
  EnterpriseStatusController,
  publicEnterpriseStatus,
} from "../../src/enterprise/enterprise-status.controller";

describe("GET /v1/enterprise/status", () => {
  let app: INestApplication;
  const forwardPublic = vi.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [EnterpriseStatusController],
      providers: [
        {
          provide: EnterpriseProxyService,
          useValue: { forwardPublic },
        },
      ],
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

  it("strips model, LLM, and OTEL detail from the public gate", async () => {
    forwardPublic.mockResolvedValueOnce({
      available: true,
      service: { ok: true, ready: true, model: "llama3.1:8b" },
      llm: { enabled: true, ready: true, model: "llama3.1:8b", pulling: [] },
      otel: { available: true, ok: true },
    });

    const res = await request(app.getHttpServer())
      .get("/v1/enterprise/status")
      .expect(200);

    expect(res.body).toEqual({
      available: true,
      service: { ok: true },
    });
  });

  it("treats a missing or malformed QEngine body as unavailable", () => {
    expect(publicEnterpriseStatus(null)).toEqual({
      available: false,
      service: { ok: false },
    });
    expect(publicEnterpriseStatus("nope")).toEqual({
      available: false,
      service: { ok: false },
    });
  });

  it("reports unavailable when QEngine says it is not", async () => {
    forwardPublic.mockResolvedValueOnce({
      available: false,
      service: { ok: false },
    });

    const res = await request(app.getHttpServer())
      .get("/v1/enterprise/status")
      .expect(200);

    expect(res.body).toEqual({
      available: false,
      service: { ok: false },
    });
  });
});
