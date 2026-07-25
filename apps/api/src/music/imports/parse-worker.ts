import { parentPort, workerData } from "node:worker_threads";
import { readFile } from "fs/promises";
import { parseKoitoDbFile } from "./parsers/koito-db";
import { parseKoitoJson } from "./parsers/koito-json";
import { parseLastFmJson } from "./parsers/lastfm";
import { parseListenBrainzZip } from "./parsers/listenbrainz";
import { parseMalojaJson } from "./parsers/maloja";
import { parseSpotifyJson } from "./parsers/spotify";
import type { ImportSource, ParsedListen } from "./parsers/types";

type WorkerInput = {
  source: ImportSource;
  stagedPath: string;
};

type WorkerOk = {
  ok: true;
  listens: Array<Omit<ParsedListen, "listenedAt"> & { listenedAt: string }>;
};

type WorkerErr = { ok: false; error: string };

async function parseAll(
  source: ImportSource,
  stagedPath: string,
): Promise<ParsedListen[]> {
  switch (source) {
    case "koito_db":
      return parseKoitoDbFile(stagedPath);
    case "koito_json":
      return parseKoitoJson(await readFile(stagedPath, "utf8"));
    case "spotify_json":
      return parseSpotifyJson(await readFile(stagedPath, "utf8"));
    case "maloja_json":
      return parseMalojaJson(await readFile(stagedPath, "utf8"));
    case "lastfm_json":
      return parseLastFmJson(await readFile(stagedPath, "utf8"));
    case "listenbrainz_zip":
      return parseListenBrainzZip(await readFile(stagedPath));
    default: {
      const _exhaustive: never = source;
      throw new Error(`Unsupported source: ${_exhaustive}`);
    }
  }
}

async function main() {
  if (!parentPort) throw new Error("parse-worker must run as a worker thread");
  const { source, stagedPath } = workerData as WorkerInput;
  const listens = await parseAll(source, stagedPath);
  const payload: WorkerOk = {
    ok: true,
    listens: listens.map((item) => ({
      ...item,
      listenedAt: item.listenedAt.toISOString(),
    })),
  };
  parentPort.postMessage(payload);
}

main().catch((err) => {
  const payload: WorkerErr = {
    ok: false,
    error: err instanceof Error ? err.message : String(err),
  };
  parentPort?.postMessage(payload);
});
