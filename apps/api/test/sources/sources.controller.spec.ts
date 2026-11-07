import { INestApplication } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SourcesController } from "../../src/sources/sources.controller";
import { SourcesService } from "../../src/sources/sources.service";
import { SessionUserGuard } from "../../src/watch/auth/session-user.guard";

describe("SourcesController", () => {
  let app: INestApplication;
  let allow = true;
  const overview = vi.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SourcesController],
      providers: [{ provide: SourcesService, useValue: { overview } }],
    })
      .overrideGuard(SessionUserGuard)
      .useValue({
        canActivate(ctx: ExecutionContext) {
          if (!allow) return false;
          ctx.switchToHttp().getRequest().watchUserId = "session-user";
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
    overview.mockReset();
  });

  it("returns the overview for the session user", async () => {
    overview.mockResolvedValue({ connected: 0, domains: [] });
    const res = await request(app.getHttpServer()).get("/sources").expect(200);
    expect(res.body).toEqual({ connected: 0, domains: [] });
    expect(overview).toHaveBeenCalledWith("session-user");
  });

  it("ignores a userId in the query string", async () => {
    overview.mockResolvedValue({ connected: 0, domains: [] });
    await request(app.getHttpServer())
      .get("/sources")
      .query({ userId: "victim" })
      .expect(200);
    expect(overview).toHaveBeenCalledWith("session-user");
  });

  it("denies a request without a session", async () => {
    allow = false;
    await request(app.getHttpServer()).get("/sources").expect(403);
    expect(overview).not.toHaveBeenCalled();
  });
});
