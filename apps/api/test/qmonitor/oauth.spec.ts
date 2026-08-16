import { createHash } from "node:crypto";
import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { INestApplication, VersioningType } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import {
  SESSION_COOKIE_NAME,
  encodeSessionCookie,
} from "@questorylabs/shared/session";
import { PrismaService } from "../../src/prisma/prisma.service";
import { GameMergeService } from "../../src/stores/game-merge.service";
import { QmonitorOauthController } from "../../src/qmonitor/qmonitor-oauth.controller";
import { QmonitorOauthService } from "../../src/qmonitor/qmonitor-oauth.service";
import { QmonitorIngestService } from "../../src/qmonitor/qmonitor-ingest.service";
import { QmonitorSessionRulesService } from "../../src/qmonitor/qmonitor-session-rules.service";
import { QmonitorWebhookController } from "../../src/qmonitor/qmonitor-webhook.controller";
import {
  pkceS256Challenge,
  signAccessToken,
  verifyAccessToken,
} from "../../src/qmonitor/qmonitor-crypto";
import { ApiHealthController } from "../../src/health.controller";

describe("qmonitor crypto", () => {
  it("signs and verifies access tokens", () => {
    process.env.SESSION_SECRET = "test-session-secret-32chars!!";
    const token = signAccessToken({ sub: "u1", sid: "s1" });
    const claims = verifyAccessToken(token);
    expect(claims?.sub).toBe("u1");
    expect(claims?.sid).toBe("s1");
  });

  it("pkce challenge matches", () => {
    const verifier = "a".repeat(43);
    const challenge = pkceS256Challenge(verifier);
    expect(challenge).toBe(
      createHash("sha256").update(verifier, "utf8").digest("base64url"),
    );
  });
});

describe("GET /api/health", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.WEB_ORIGIN = "http://localhost:3000";
    const moduleRef = await Test.createTestingModule({
      controllers: [ApiHealthController],
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

  it("returns service=be and webOrigin", async () => {
    const res = await request(app.getHttpServer()).get("/api/health").expect(200);
    expect(res.body).toMatchObject({
      ok: true,
      service: "be",
      webOrigin: "http://localhost:3000",
    });
  });
});

describe("qmonitor oauth token flow", () => {
  let app: INestApplication;
  const secret = "test-session-secret-32chars!!";
  const userId = "user-qmonitor-1";

  type SessionRow = {
    id: string;
    userId: string;
    deviceIdHash: string;
    refreshTokenHash: string;
    revokedAt: Date | null;
  };

  const store = {
    codes: new Map<string, Record<string, unknown>>(),
    sessions: new Map<string, SessionRow>(),
  };

  const prismaMock = {
    qmonitorAuthCode: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: "code1", consumedAt: null, ...data };
        store.codes.set(String(data.codeHash), row);
        return row;
      },
      findUnique: async ({ where }: { where: { codeHash: string } }) =>
        store.codes.get(where.codeHash) ?? null,
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        for (const [k, v] of store.codes) {
          if (v.id === where.id) {
            const next = { ...v, ...data };
            store.codes.set(k, next);
            return next;
          }
        }
        return null;
      },
    },
    qmonitorDeviceSession: {
      findUnique: async ({
        where,
      }: {
        where: { userId_deviceIdHash: { userId: string; deviceIdHash: string } };
      }) => {
        const key = `${where.userId_deviceIdHash.userId}:${where.userId_deviceIdHash.deviceIdHash}`;
        return store.sessions.get(key) ?? null;
      },
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        for (const s of store.sessions.values()) {
          if (
            where.refreshTokenHash &&
            s.refreshTokenHash !== where.refreshTokenHash
          ) {
            continue;
          }
          if (where.id && s.id !== where.id) continue;
          if (where.userId && s.userId !== where.userId) continue;
          if (where.revokedAt === null && s.revokedAt) continue;
          return s;
        }
        return null;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row: SessionRow = {
          id: `sess-${store.sessions.size + 1}`,
          userId: String(data.userId),
          deviceIdHash: String(data.deviceIdHash),
          refreshTokenHash: String(data.refreshTokenHash),
          revokedAt: null,
        };
        store.sessions.set(`${row.userId}:${row.deviceIdHash}`, row);
        return row;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        for (const [k, s] of store.sessions) {
          if (s.id === where.id) {
            const next = { ...s, ...data } as SessionRow;
            store.sessions.set(k, next);
            return next;
          }
        }
        return null;
      },
      updateMany: async () => ({ count: 0 }),
    },
    playSession: {
      upsert: async ({ create }: { create: Record<string, unknown> }) => ({
        id: "ps1",
        ...create,
      }),
    },
    libraryEntry: {
      findUnique: async () => null,
      update: async () => ({}),
    },
    user: {
      findUnique: async ({ where: { id } }: { where: { id: string } }) => ({
        id,
        sessionEpoch: 0,
        disabledAt: null,
        emailVerifiedAt: new Date(),
        email: `${id}@example.com`,
        isAdmin: false,
      }),
    },
  };

  beforeAll(async () => {
    process.env.SESSION_SECRET = secret;
    process.env.WEB_ORIGIN = "http://localhost:3000";

    const moduleRef = await Test.createTestingModule({
      controllers: [QmonitorOauthController, QmonitorWebhookController],
      providers: [
        QmonitorOauthService,
        QmonitorIngestService,
        {
          provide: QmonitorSessionRulesService,
          useValue: { resolveTarget: async () => null },
        },
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: GameMergeService,
          useValue: {
            upsertListing: async () => ({
              game: { id: "g1", appId: 570 },
              listing: { id: "l1" },
            }),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: "1",
    });
    app.use(cookieParser(secret));
    await app.init();
  });

  beforeEach(() => {
    store.codes.clear();
    store.sessions.clear();
  });

  afterAll(async () => {
    await app?.close();
  });

  it("approve requires session", async () => {
    await request(app.getHttpServer())
      .post("/oauth/qmonitor/approve")
      .send({ pending: "x" })
      .expect(401);
  });

  it("exchanges code and binds refresh to device_id", async () => {
    const deviceId = "d".repeat(16);
    const verifier = "v".repeat(43);
    const challenge = pkceS256Challenge(verifier);
    const cookie = encodeSessionCookie({ userId, steamId: null }, secret);

    const pendingRes = await request(app.getHttpServer())
      .post("/oauth/qmonitor/pending")
      .set("Cookie", `${SESSION_COOKIE_NAME}=${cookie}`)
      .send({
        client_id: "qmonitor",
        redirect_uri: "http://127.0.0.1:58473/callback",
        state: "state1234",
        scope: "qmonitor",
        code_challenge: challenge,
        code_challenge_method: "S256",
        device_id: deviceId,
        response_type: "code",
      })
      .expect(200);

    const approve = await request(app.getHttpServer())
      .post("/oauth/qmonitor/approve")
      .set("Cookie", `${SESSION_COOKIE_NAME}=${cookie}`)
      .send({ pending: pendingRes.body.pending })
      .expect(200);

    const code = new URL(approve.body.redirectTo as string).searchParams.get(
      "code",
    )!;

    const token = await request(app.getHttpServer())
      .post("/oauth/qmonitor/token")
      .send({
        grant_type: "authorization_code",
        code,
        redirect_uri: "http://127.0.0.1:58473/callback",
        client_id: "qmonitor",
        code_verifier: verifier,
        device_id: deviceId,
      })
      .expect(200);

    expect(token.body.access_token).toBeTruthy();
    expect(token.body.refresh_token).toBeTruthy();

    await request(app.getHttpServer())
      .post("/oauth/qmonitor/token")
      .send({
        grant_type: "refresh_token",
        refresh_token: token.body.refresh_token,
        device_id: "x".repeat(16),
        client_id: "qmonitor",
      })
      .expect(401);

    const refreshed = await request(app.getHttpServer())
      .post("/oauth/qmonitor/token")
      .send({
        grant_type: "refresh_token",
        refresh_token: token.body.refresh_token,
        device_id: deviceId,
        client_id: "qmonitor",
      })
      .expect(200);
    expect(refreshed.body.access_token).toBeTruthy();

    const webhook = await request(app.getHttpServer())
      .post("/webhooks/qmonitor")
      .set("Authorization", `Bearer ${refreshed.body.access_token}`)
      .send({
        schema_version: 1,
        session_id: "sess-1",
        source: "steam",
        steam_app_id: 570,
        title: "Dota 2",
        started_at: "2026-01-01T00:00:00.000Z",
        ended_at: "2026-01-01T01:00:00.000Z",
        duration_secs: 3600,
        host: { os: "windows", hostname: "pc" },
      })
      .expect(200);
    expect(webhook.body.ok).toBe(true);
  });
});
