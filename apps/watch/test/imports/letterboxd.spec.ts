import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { INestApplication, VersioningType } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { ImportsController } from "../../src/imports/imports.controller";
import { LetterboxdService } from "../../src/imports/letterboxd.service";
import { SessionUserGuard } from "../../src/auth/session-user.guard";
import { UsersService } from "../../src/users/users.service";

describe("letterboxd import auth", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.APP_MODE = "production";
    process.env.SESSION_SECRET = "test-session-secret-32chars!!";
    const moduleRef = await Test.createTestingModule({
      controllers: [ImportsController],
      providers: [
        SessionUserGuard,
        {
          provide: UsersService,
          useValue: { resolveSoleUser: async () => null },
        },
        {
          provide: LetterboxdService,
          useValue: {
            importDiaryCsv: async () => ({ accepted: 0, skipped: 0 }),
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

  it("denies unauthenticated upload", async () => {
    await request(app.getHttpServer())
      .post("/v1/imports/letterboxd")
      .attach("file", Buffer.from("Date,Name\n"), "diary.csv")
      .expect(401);
  });
});
