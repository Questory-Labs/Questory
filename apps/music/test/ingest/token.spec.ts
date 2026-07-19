import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { INestApplication, VersioningType } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { ListenBrainzController } from "../../src/listenbrainz/listenbrainz.controller";
import { ListenBrainzService } from "../../src/listenbrainz/listenbrainz.service";
import { TokenGuard } from "../../src/listenbrainz/token.guard";
import { UsersService } from "../../src/users/users.service";
import { hashToken } from "../../src/lib/tokens";

describe("music ingest token", () => {
  let app: INestApplication;
  const token = "ingest-secret-token";

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ListenBrainzController],
      providers: [
        TokenGuard,
        {
          provide: UsersService,
          useValue: {
            findByTokenHash: async (h: string) =>
              h === hashToken(token)
                ? { id: "u1", username: "alice", personaName: "Alice" }
                : null,
          },
        },
        {
          provide: ListenBrainzService,
          useValue: {
            validateToken: async (t: string | null) => ({
              valid: Boolean(t && t === token),
              user_name: t === token ? "alice" : undefined,
              code: 200,
              message: t === token ? "Token valid." : "Token invalid.",
            }),
            submitListens: async () => ({ status: "ok" }),
            getListens: async () => null,
            getListenCount: async () => null,
            getPlayingNow: async () => null,
          },
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

  it("accepts Authorization Token header", async () => {
    await request(app.getHttpServer())
      .post("/1/submit-listens")
      .set("Authorization", `Token ${token}`)
      .send({
        listen_type: "single",
        payload: [
          {
            listened_at: 1,
            track_metadata: { artist_name: "A", track_name: "T" },
          },
        ],
      })
      .expect(201);
  });

  it("rejects query-string token", async () => {
    await request(app.getHttpServer())
      .post(`/1/submit-listens?token=${token}`)
      .send({
        listen_type: "single",
        payload: [
          {
            listened_at: 1,
            track_metadata: { artist_name: "A", track_name: "T" },
          },
        ],
      })
      .expect(401);
  });

  it("rejects wrong token", async () => {
    await request(app.getHttpServer())
      .post("/1/submit-listens")
      .set("Authorization", "Token wrong")
      .send({
        listen_type: "single",
        payload: [
          {
            listened_at: 1,
            track_metadata: { artist_name: "A", track_name: "T" },
          },
        ],
      })
      .expect(401);
  });

  it("validate-token does not echo plaintext token", async () => {
    const res = await request(app.getHttpServer())
      .get("/1/validate-token")
      .set("Authorization", `Token ${token}`)
      .expect(200);
    expect(JSON.stringify(res.body)).not.toContain(token);
  });
});
