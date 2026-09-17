import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { INestApplication, VersioningType } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import {
  SESSION_COOKIE_NAME,
  encodeSessionCookie,
} from "@questorylabs/shared/session";
import { FamilyController } from "../../src/family/family.controller";
import { FamilyService } from "../../src/family/family.service";
import { FamilyMembersService } from "../../src/family/family-members.service";

describe("family validation", () => {
  let app: INestApplication;
  const secret = "test-session-secret-32chars!!";

  beforeAll(async () => {
    process.env.SESSION_SECRET = secret;
    const moduleRef = await Test.createTestingModule({
      controllers: [FamilyController],
      providers: [
        {
          provide: FamilyService,
          useValue: {
            getGroup: async () => ({}),
            getOrCreate: async () => ({}),
            insights: async () => ({}),
            library: async () => ({}),
            gameDetail: async () => ({}),
          },
        },
        {
          provide: FamilyMembersService,
          useValue: {
            addMember: async () => ({}),
            importFromFriends: async () => ({}),
            removeMember: async () => ({ ok: true }),
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

  afterAll(async () => {
    await app.close();
  });

  function cookie() {
    return `${SESSION_COOKIE_NAME}=${encodeSessionCookie(
      { userId: "u1", steamId: "76561198000000000" },
      secret,
    )}`;
  }

  it("rejects SQL-looking steam ids", async () => {
    await request(app.getHttpServer())
      .post("/v1/family/members")
      .set("Cookie", cookie())
      .send({ steamId: "' OR 1=1 --" })
      .expect(400);
  });

  it("rejects huge pageSize", async () => {
    await request(app.getHttpServer())
      .get("/v1/family/library?pageSize=999999")
      .set("Cookie", cookie())
      .expect(400);
  });

  it("accepts valid SteamID64", async () => {
    await request(app.getHttpServer())
      .post("/v1/family/members")
      .set("Cookie", cookie())
      .send({ steamId: "76561198000000000" })
      .expect(201);
  });

  it("rejects a non-SteamID64 member delete", async () => {
    await request(app.getHttpServer())
      .delete("/v1/family/members/not-a-steam-id")
      .set("Cookie", cookie())
      .expect(400);
  });

  it("accepts a SteamID64 member delete", async () => {
    await request(app.getHttpServer())
      .delete("/v1/family/members/76561198000000000")
      .set("Cookie", cookie())
      .expect(200);
  });

  it("rejects importing more than the family member cap", async () => {
    const steamIds = [
      "76561198000000000",
      "76561198000000001",
      "76561198000000002",
      "76561198000000003",
      "76561198000000004",
      "76561198000000005",
      "76561198000000006",
    ];
    await request(app.getHttpServer())
      .post("/v1/family/members/import")
      .set("Cookie", cookie())
      .send({ steamIds })
      .expect(400);
  });
});
