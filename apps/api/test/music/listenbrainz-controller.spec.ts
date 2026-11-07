import { INestApplication, VersioningType } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { hashToken } from "../../src/music/lib/tokens";
import { ListenBrainzController } from "../../src/music/listenbrainz/listenbrainz.controller";
import { ListenBrainzService } from "../../src/music/listenbrainz/listenbrainz.service";
import { TokenGuard } from "../../src/music/listenbrainz/token.guard";
import { ListenBrainzNativeMutexGuard } from "../../src/music/scrobbler/listenbrainz-native-mutex.guard";
import { LB_NATIVE_DISABLED_ERROR } from "../../src/music/scrobbler/scrobbler.constants";
import { ScrobblerConnections } from "../../src/music/scrobbler/scrobbler.connections";
import { UsersService } from "../../src/music/users/users.service";

describe("ListenBrainzController", () => {
  let app: INestApplication;
  const lb = {
    validateToken: vi.fn(),
    submitListens: vi.fn(),
    getListens: vi.fn(),
    getListenCount: vi.fn(),
    getPlayingNow: vi.fn(),
  };
  const users = { findByTokenHash: vi.fn(), findByUsername: vi.fn() };
  const connections = { hasNative: vi.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ListenBrainzController],
      providers: [
        TokenGuard,
        ListenBrainzNativeMutexGuard,
        { provide: ListenBrainzService, useValue: lb },
        { provide: UsersService, useValue: users },
        { provide: ScrobblerConnections, useValue: connections },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
    await app.listen(0, "127.0.0.1");
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    for (const fn of [...Object.values(lb), ...Object.values(users)]) {
      fn.mockReset();
    }
    connections.hasNative.mockReset();
    connections.hasNative.mockResolvedValue(false);
    users.findByUsername.mockResolvedValue({ id: "u1" });
  });

  describe("submit-listens auth", () => {
    const body = { listen_type: "single", payload: [{}] };

    it("rejects a request with no credentials", async () => {
      const res = await request(app.getHttpServer())
        .post("/1/submit-listens")
        .send(body)
        .expect(401);
      expect(res.body).toEqual({
        code: 401,
        error: "Invalid authorization token supplied",
      });
      expect(lb.submitListens).not.toHaveBeenCalled();
    });

    it("rejects ?token= even when it would be a valid key", async () => {
      users.findByTokenHash.mockResolvedValue({ id: "u1", username: "rj" });
      await request(app.getHttpServer())
        .post("/1/submit-listens")
        .query({ token: "good" })
        .send(body)
        .expect(401);
      expect(users.findByTokenHash).not.toHaveBeenCalled();
      expect(lb.submitListens).not.toHaveBeenCalled();
    });

    it("rejects a Bearer credential", async () => {
      await request(app.getHttpServer())
        .post("/1/submit-listens")
        .set("Authorization", "Bearer good")
        .send(body)
        .expect(401);
      expect(users.findByTokenHash).not.toHaveBeenCalled();
    });

    it("rejects a revoked or wrong-type key (lookup misses)", async () => {
      users.findByTokenHash.mockResolvedValue(null);
      await request(app.getHttpServer())
        .post("/1/submit-listens")
        .set("Authorization", "Token revoked")
        .send(body)
        .expect(401);
      expect(users.findByTokenHash).toHaveBeenCalledWith(hashToken("revoked"));
      expect(lb.submitListens).not.toHaveBeenCalled();
    });

    it("binds the submission to the token owner, ignoring body fields", async () => {
      users.findByTokenHash.mockResolvedValue({ id: "u1", username: "rj" });
      lb.submitListens.mockResolvedValue({ status: "ok", accepted: 1 });
      const sent = { ...body, userId: "victim", user: "victim" };
      const res = await request(app.getHttpServer())
        .post("/1/submit-listens")
        .set("Authorization", "Token good")
        .send(sent)
        .expect(201);
      expect(res.body).toEqual({ status: "ok", accepted: 1 });
      expect(lb.submitListens).toHaveBeenCalledWith("u1", sent);
    });

    it("blocks ingest for a user with native scrobbling", async () => {
      users.findByTokenHash.mockResolvedValue({ id: "u1", username: "rj" });
      connections.hasNative.mockResolvedValue(true);
      const res = await request(app.getHttpServer())
        .post("/1/submit-listens")
        .set("Authorization", "Token good")
        .send(body)
        .expect(403);
      expect(res.body).toEqual({ code: 403, error: LB_NATIVE_DISABLED_ERROR });
      expect(lb.submitListens).not.toHaveBeenCalled();
    });

    it("serves the multi-scrobbler path alias", async () => {
      users.findByTokenHash.mockResolvedValue({ id: "u1", username: "rj" });
      lb.submitListens.mockResolvedValue({ status: "ok", accepted: 1 });
      await request(app.getHttpServer())
        .post("/apis/listenbrainz/1/submit-listens")
        .set("Authorization", "Token good")
        .send(body)
        .expect(201);
      expect(lb.submitListens).toHaveBeenCalledTimes(1);
    });
  });

  describe("validate-token", () => {
    it("passes the header token to the service", async () => {
      lb.validateToken.mockResolvedValue({ code: 200, valid: true });
      await request(app.getHttpServer())
        .get("/1/validate-token")
        .set("Authorization", "Token good")
        .expect(200);
      expect(lb.validateToken).toHaveBeenCalledWith("good");
    });

    it("does not read the token from the query string", async () => {
      lb.validateToken.mockResolvedValue({ code: 200, valid: false });
      await request(app.getHttpServer())
        .get("/1/validate-token")
        .query({ token: "good" })
        .expect(200);
      expect(lb.validateToken).toHaveBeenCalledWith(null);
    });
  });

  describe("user/:user/listens query mapping", () => {
    beforeEach(() => {
      lb.getListens.mockResolvedValue({ payload: { count: 0, listens: [] } });
    });

    it("converts numeric params", async () => {
      await request(app.getHttpServer())
        .get("/1/user/rj/listens")
        .query({ min_ts: "100", max_ts: "200", count: "5" })
        .expect(200);
      expect(lb.getListens).toHaveBeenCalledWith("rj", {
        minTs: 100,
        maxTs: 200,
        count: 5,
      });
    });

    it("maps from/to aliases", async () => {
      await request(app.getHttpServer())
        .get("/1/user/rj/listens")
        .query({ from: "10", to: "20" })
        .expect(200);
      expect(lb.getListens).toHaveBeenCalledWith("rj", {
        minTs: 10,
        maxTs: 20,
        count: undefined,
      });
    });

    it("prefers min_ts/max_ts over the aliases", async () => {
      await request(app.getHttpServer())
        .get("/1/user/rj/listens")
        .query({ from: "10", to: "20", min_ts: "30", max_ts: "40" })
        .expect(200);
      expect(lb.getListens).toHaveBeenCalledWith("rj", {
        minTs: 30,
        maxTs: 40,
        count: undefined,
      });
    });

    it("treats empty values as absent", async () => {
      await request(app.getHttpServer())
        .get("/1/user/rj/listens?min_ts=&max_ts=&count=")
        .expect(200);
      expect(lb.getListens).toHaveBeenCalledWith("rj", {
        minTs: undefined,
        maxTs: undefined,
        count: undefined,
      });
    });

    it("404s an unknown user", async () => {
      lb.getListens.mockResolvedValue(null);
      const res = await request(app.getHttpServer())
        .get("/1/user/ghost/listens")
        .expect(404);
      expect(res.body).toEqual({ error: "User not found" });
    });

    it("hides listens for a user with native scrobbling", async () => {
      connections.hasNative.mockResolvedValue(true);
      await request(app.getHttpServer()).get("/1/user/rj/listens").expect(403);
      expect(lb.getListens).not.toHaveBeenCalled();
    });
  });

  describe("user/:user counts and playing-now", () => {
    it("returns the listen count", async () => {
      lb.getListenCount.mockResolvedValue({ payload: { count: 7 } });
      const res = await request(app.getHttpServer())
        .get("/1/user/rj/listen-count")
        .expect(200);
      expect(res.body).toEqual({ payload: { count: 7 } });
      expect(lb.getListenCount).toHaveBeenCalledWith("rj");
    });

    it("404s listen-count for an unknown user", async () => {
      lb.getListenCount.mockResolvedValue(null);
      await request(app.getHttpServer())
        .get("/1/user/ghost/listen-count")
        .expect(404);
    });

    it("returns playing-now", async () => {
      lb.getPlayingNow.mockResolvedValue({ payload: { count: 0, listens: [] } });
      await request(app.getHttpServer())
        .get("/apis/listenbrainz/1/user/rj/playing-now")
        .expect(200);
      expect(lb.getPlayingNow).toHaveBeenCalledWith("rj");
    });

    it("404s playing-now for an unknown user", async () => {
      lb.getPlayingNow.mockResolvedValue(null);
      await request(app.getHttpServer())
        .get("/1/user/ghost/playing-now")
        .expect(404);
    });
  });
});
