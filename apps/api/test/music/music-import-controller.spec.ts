import { existsSync } from "fs";
import { mkdtemp, readdir, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { dirname, join, relative } from "path";
import { BadRequestException, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ root: "" }));

vi.mock("../../src/music/imports/temp-dir", () => ({
  resolveRepoTempDir: () => state.root,
}));

import { ImportsController } from "../../src/music/imports/imports.controller";
import { ImportsService } from "../../src/music/imports/imports.service";
import { UsersService } from "../../src/music/users/users.service";

type Upload = Parameters<ImportsController["upload"]>[0];

function service() {
  return {
    startImport: vi.fn().mockResolvedValue({ ok: true, jobId: "j1" }),
    getActiveJob: vi.fn().mockResolvedValue(null),
    getJob: vi.fn().mockResolvedValue({ id: "j1" }),
  };
}

const user = { userId: "u-1" };

describe("ImportsController.upload", () => {
  const file = (overrides = {}) =>
    ({
      path: "/tmp/x/upload.json",
      filename: "upload.json",
      originalname: "orig.json",
      ...overrides,
    }) as Upload;

  it("rejects a request with no file", async () => {
    const imports = service();
    const controller = new ImportsController(imports as never);
    await expect(
      controller.upload(undefined, user),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      controller.upload(file({ path: "" }), user),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(imports.startImport).not.toHaveBeenCalled();
  });

  it("starts the import for the session user with autodetection", async () => {
    const imports = service();
    const controller = new ImportsController(imports as never);
    await expect(controller.upload(file(), user)).resolves.toEqual({
      ok: true,
      jobId: "j1",
    });
    expect(imports.startImport).toHaveBeenCalledWith(
      "/tmp/x/upload.json",
      "upload.json",
      "u-1",
      undefined,
    );
  });

  it.each([
    "koito_db",
    "koito_json",
    "spotify_json",
    "maloja_json",
    "lastfm_json",
    "listenbrainz_zip",
  ])("accepts source override %s", async (source) => {
    const imports = service();
    const controller = new ImportsController(imports as never);
    await controller.upload(file(), user, source);
    expect(imports.startImport.mock.calls[0][3]).toBe(source);
  });

  it.each(["letterboxd", "KOITO_DB", "../koito_db"])(
    "rejects unknown source %s",
    async (source) => {
      const imports = service();
      const controller = new ImportsController(imports as never);
      await expect(
        controller.upload(file(), user, source),
      ).rejects.toThrow(/Unknown source/);
      expect(imports.startImport).not.toHaveBeenCalled();
    },
  );

  it("treats an empty source as autodetect", async () => {
    const imports = service();
    const controller = new ImportsController(imports as never);
    await controller.upload(file(), user, "");
    expect(imports.startImport.mock.calls[0][3]).toBeUndefined();
  });

  it.each([
    ["../../etc/passwd", ".._.._etc_passwd"],
    ["..\\..\\evil.json", ".._.._evil.json"],
    ["/abs/path.json", "_abs_path.json"],
  ])("neutralises separators in %s", async (filename, expected) => {
    const imports = service();
    const controller = new ImportsController(imports as never);
    await controller.upload(file({ filename }), user);
    expect(imports.startImport.mock.calls[0][1]).toBe(expected);
  });

  it("falls back through originalname to a default", async () => {
    const imports = service();
    const controller = new ImportsController(imports as never);
    await controller.upload(file({ filename: "" }), user);
    expect(imports.startImport.mock.calls[0][1]).toBe("orig.json");
    await controller.upload(file({ filename: "", originalname: "" }), user);
    expect(imports.startImport.mock.calls[1][1]).toBe("import.bin");
  });

  describe("failure cleanup", () => {
    let dir: string;

    beforeEach(async () => {
      dir = await mkdtemp(join(tmpdir(), "music-import-ctrl-"));
      await writeFile(join(dir, "upload.json"), "{}");
    });

    afterEach(async () => {
      await rm(dir, { recursive: true, force: true });
    });

    it("removes the upload dir and rethrows the service error", async () => {
      const imports = service();
      const failure = new Error("rejected");
      imports.startImport.mockRejectedValueOnce(failure);
      const controller = new ImportsController(imports as never);
      await expect(
        controller.upload(file({ destination: dir }), user),
      ).rejects.toBe(failure);
      expect(existsSync(dir)).toBe(false);
    });

    it("removes the upload dir for an unknown source", async () => {
      const imports = service();
      const controller = new ImportsController(imports as never);
      await expect(
        controller.upload(file({ destination: dir }), user, "letterboxd"),
      ).rejects.toThrow(/Unknown source/);
      expect(existsSync(dir)).toBe(false);
    });

    it("rethrows when the file has no destination", async () => {
      const imports = service();
      imports.startImport.mockRejectedValueOnce(new Error("rejected"));
      const controller = new ImportsController(imports as never);
      await expect(controller.upload(file(), user)).rejects.toThrow("rejected");
    });
  });
});

describe("ImportsController queries", () => {
  it("scopes active job and job lookups to the session user", async () => {
    const imports = service();
    const controller = new ImportsController(imports as never);
    await controller.getActive(user);
    await controller.getJob("j9", user);
    expect(imports.getActiveJob).toHaveBeenCalledWith("u-1");
    expect(imports.getJob).toHaveBeenCalledWith("j9", "u-1");
  });
});

describe("ImportsController over HTTP", () => {
  let app: INestApplication;
  let imports: ReturnType<typeof service>;
  let users: { resolveSoleUser: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    state.root = await mkdtemp(join(tmpdir(), "music-import-http-"));
    imports = service();
    users = { resolveSoleUser: vi.fn().mockResolvedValue({ id: "sole-1" }) };
    const moduleRef = await Test.createTestingModule({
      controllers: [ImportsController],
      providers: [
        { provide: ImportsService, useValue: imports },
        { provide: UsersService, useValue: users },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.listen(0, "127.0.0.1");
  });

  afterEach(async () => {
    await app.close();
    await rm(state.root, { recursive: true, force: true });
  });

  const uploadsRoot = () => join(state.root, "music-uploads");
  const post = (name = "listens.json", body = Buffer.from("{}")) =>
    request(app.getHttpServer())
      .post("/music/imports")
      .attach("file", body, { filename: name });

  it("rejects unauthenticated uploads before storing anything", async () => {
    users.resolveSoleUser.mockResolvedValueOnce(null);
    await post().expect(401);
    expect(imports.startImport).not.toHaveBeenCalled();
    expect(existsSync(uploadsRoot())).toBe(false);
  });

  it("rejects unauthenticated job reads", async () => {
    users.resolveSoleUser.mockResolvedValue(null);
    await request(app.getHttpServer()).get("/music/imports/active").expect(401);
    await request(app.getHttpServer()).get("/music/imports/j1").expect(401);
    expect(imports.getActiveJob).not.toHaveBeenCalled();
    expect(imports.getJob).not.toHaveBeenCalled();
  });

  it("stores the upload in its own directory and forwards the user", async () => {
    const body = Buffer.from('{"scrobbles":[]}');
    await post("listens.json", body).expect(201);
    const [path, name, userId, source] = imports.startImport.mock.calls[0];
    expect(name).toBe("listens.json");
    expect(userId).toBe("sole-1");
    expect(source).toBeUndefined();
    expect(dirname(dirname(path))).toBe(uploadsRoot());
    expect((await readFile(path)).equals(body)).toBe(true);
  });

  it("gives concurrent uploads separate directories", async () => {
    await post().expect(201);
    await post().expect(201);
    const [a, b] = imports.startImport.mock.calls.map((c) => dirname(c[0]));
    expect(a).not.toBe(b);
  });

  it.each([
    "../../../evil.json",
    "..\\..\\..\\evil.json",
    "/etc/evil.json",
  ])("keeps a traversal filename %s inside the upload dir", async (name) => {
    await post(name).expect(201);
    const [path, stored] = imports.startImport.mock.calls[0];
    expect(relative(uploadsRoot(), path).startsWith("..")).toBe(false);
    expect(stored).not.toMatch(/[/\\]/);
    expect(await readdir(state.root)).toEqual(["music-uploads"]);
  });

  it("keeps a unicode filename", async () => {
    await post("履歴.json").expect(201);
    expect(existsSync(imports.startImport.mock.calls[0][0])).toBe(true);
  });

  it("forwards a valid source and rejects an unknown one", async () => {
    await post().query({ source: "maloja_json" }).expect(201);
    expect(imports.startImport.mock.calls[0][3]).toBe("maloja_json");
    await post().query({ source: "letterboxd" }).expect(400);
    expect(imports.startImport).toHaveBeenCalledOnce();
  });

  it("answers 400 for a file under the wrong field", async () => {
    const res = await request(app.getHttpServer())
      .post("/music/imports")
      .attach("other", Buffer.from("{}"), { filename: "a.json" })
      .expect(400);
    expect(res.body).toEqual({
      statusCode: 400,
      error: "Bad Request",
      message: "Upload an import file as multipart field `file`",
    });
    expect(imports.startImport).not.toHaveBeenCalled();
  });

  it("removes the upload when the source is unknown", async () => {
    await post().query({ source: "letterboxd" }).expect(400);
    expect(await readdir(uploadsRoot())).toEqual([]);
  });

  it("rejects a request with no multipart body", async () => {
    await request(app.getHttpServer()).post("/music/imports").expect(400);
    expect(imports.startImport).not.toHaveBeenCalled();
  });

  it("rejects a file over the 120 MiB limit", async () => {
    await post("big.json", Buffer.alloc(120 * 1024 * 1024 + 1)).expect(413);
    expect(imports.startImport).not.toHaveBeenCalled();
  });

  it("removes the upload when the service rejects", async () => {
    imports.startImport.mockRejectedValueOnce(new BadRequestException("nope"));
    await post().expect(400);
    expect(await readdir(uploadsRoot())).toEqual([]);
  });

  it("routes active ahead of the job id param", async () => {
    await request(app.getHttpServer()).get("/music/imports/active").expect(200);
    expect(imports.getActiveJob).toHaveBeenCalledWith("sole-1");
    expect(imports.getJob).not.toHaveBeenCalled();
  });

  it("forwards the job id and user", async () => {
    await request(app.getHttpServer()).get("/music/imports/j7").expect(200);
    expect(imports.getJob).toHaveBeenCalledWith("j7", "sole-1");
  });
});
