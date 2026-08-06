import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ScraperDefinition } from "@questorylabs/shared";
import { LETTERBOXD_SCRAPER_DEFINITION } from "../../src/scraper/letterboxd-default-config";
import { ScraperEngineService } from "../../src/scraper/scraper-engine.service";

const fixture = readFileSync(
  resolve(__dirname, "fixtures/letterboxd-diary.html"),
  "utf8",
);

describe("ScraperEngineService", () => {
  let server: Server;
  let baseUrl: string;
  let definition: ScraperDefinition;
  const engine = new ScraperEngineService();

  beforeAll(async () => {
    server = createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(fixture);
    });

    await new Promise<void>((resolveListen) => {
      server.listen(0, "127.0.0.1", () => resolveListen());
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to bind test HTTP server");
    }

    baseUrl = `http://127.0.0.1:${address.port}/`;
    definition = {
      ...LETTERBOXD_SCRAPER_DEFINITION,
      startUrl: baseUrl,
      pagination: {
        type: "urlTemplate",
        urlTemplate: `${baseUrl}page/{{page}}/`,
      },
    };
  });

  afterAll(async () => {
    await new Promise<void>((resolveClose, reject) => {
      server.close((error) => (error ? reject(error) : resolveClose()));
    });
  });

  it("scrapes the same URL on repeated runs in one process", async () => {
    const runOnce = async () => {
      const pages: Array<{ page: number; rowCount: number }> = [];
      await engine.run(definition, {}, {
        maxPages: 1,
        onPage: async (rows, page) => {
          pages.push({ page, rowCount: rows.length });
          return "continue";
        },
      });
      return pages;
    };

    const firstRun = await runOnce();
    const secondRun = await runOnce();

    expect(firstRun).toEqual([{ page: 1, rowCount: 3 }]);
    expect(secondRun).toEqual([{ page: 1, rowCount: 3 }]);
  });
});
