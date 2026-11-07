import { INestApplication } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiKeysController } from "../../src/api-keys/api-keys.controller";
import { ApiKeysService } from "../../src/api-keys/api-keys.service";
import { SteamAuthGuard } from "../../src/auth/auth.guard";

describe("ApiKeysController", () => {
  let app: INestApplication;
  let allow = true;
  const service = {
    list: vi.fn(),
    identity: vi.fn(),
    listPublic: vi.fn(),
    createPublic: vi.fn(),
    create: vi.fn(),
    revoke: vi.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ApiKeysController],
      providers: [{ provide: ApiKeysService, useValue: service }],
    })
      .overrideGuard(SteamAuthGuard)
      .useValue({
        canActivate(ctx: ExecutionContext) {
          if (!allow) return false;
          ctx.switchToHttp().getRequest().userId = "u1";
          return true;
        },
      })
      .compile();
    app = moduleRef.createNestApplication();
    await app.listen(0, "127.0.0.1");
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    allow = true;
    for (const fn of Object.values(service)) {
      fn.mockReset();
      fn.mockResolvedValue({ ok: true });
    }
  });

  it.each([
    ["get", "/api-keys"],
    ["get", "/api-keys/identity"],
    ["get", "/api-keys/public"],
    ["post", "/api-keys"],
    ["post", "/api-keys/public"],
    ["delete", "/api-keys/k1"],
  ] as const)("%s %s is denied without a session", async (method, path) => {
    allow = false;
    await request(app.getHttpServer())[method](path).expect(403);
    for (const fn of Object.values(service)) {
      expect(fn).not.toHaveBeenCalled();
    }
  });

  it("lists keys for the session user", async () => {
    await request(app.getHttpServer()).get("/api-keys").expect(200);
    expect(service.list).toHaveBeenCalledWith("u1");
  });

  it("routes identity and public before anything else", async () => {
    await request(app.getHttpServer()).get("/api-keys/identity").expect(200);
    await request(app.getHttpServer()).get("/api-keys/public").expect(200);
    expect(service.identity).toHaveBeenCalledWith("u1");
    expect(service.listPublic).toHaveBeenCalledWith("u1");
    expect(service.list).not.toHaveBeenCalled();
  });

  it("creates with the type and label from the body", async () => {
    await request(app.getHttpServer())
      .post("/api-keys")
      .send({ type: "watch_webhook", label: "Plex" })
      .expect(201);
    expect(service.create).toHaveBeenCalledWith("u1", {
      type: "watch_webhook",
      label: "Plex",
    });
  });

  it("passes an empty type when none was sent", async () => {
    await request(app.getHttpServer()).post("/api-keys").send({}).expect(201);
    expect(service.create).toHaveBeenCalledWith("u1", {
      type: "",
      label: undefined,
    });
  });

  it("treats an empty request body as a missing type", async () => {
    await request(app.getHttpServer()).post("/api-keys").expect(201);
    expect(service.create).toHaveBeenCalledWith("u1", {
      type: "",
      label: undefined,
    });
  });

  it("accepts a null label", async () => {
    await request(app.getHttpServer())
      .post("/api-keys")
      .send({ type: "watch_webhook", label: null })
      .expect(201);
    expect(service.create).toHaveBeenCalledWith("u1", {
      type: "watch_webhook",
      label: null,
    });
  });

  it.each([
    ["numeric label", { type: "watch_webhook", label: 123 }],
    ["object label", { type: "watch_webhook", label: {} }],
    ["numeric type", { type: 5 }],
    ["array body", [{ type: "watch_webhook" }]],
  ])("rejects %s before reaching the service", async (_name, body) => {
    await request(app.getHttpServer()).post("/api-keys").send(body).expect(400);
    expect(service.create).not.toHaveBeenCalled();
  });

  it("never lets the body choose the key owner", async () => {
    await request(app.getHttpServer())
      .post("/api-keys")
      .send({ type: "music_ingest", userId: "victim" })
      .expect(201);
    expect(service.create).toHaveBeenCalledWith("u1", {
      type: "music_ingest",
      label: undefined,
    });
  });

  it("passes the public create body to the service for validation", async () => {
    const body = { label: "x", scopes: ["profile:read"] };
    await request(app.getHttpServer())
      .post("/api-keys/public")
      .send(body)
      .expect(201);
    expect(service.createPublic).toHaveBeenCalledWith("u1", body);
    expect(service.create).not.toHaveBeenCalled();
  });

  it("revokes by id for the session user", async () => {
    await request(app.getHttpServer()).delete("/api-keys/k1").expect(200);
    expect(service.revoke).toHaveBeenCalledWith("u1", "k1");
  });
});
