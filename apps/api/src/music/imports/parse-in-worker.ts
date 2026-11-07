import { Worker } from "node:worker_threads";
import { join } from "path";
import { ImportParseError, type ImportSource, type ParsedListen } from "./parsers/types";

const WORKER_MAX_HEAP_MB = 2048;

type WorkerMsg =
  | {
      ok: true;
      listens: Array<Omit<ParsedListen, "listenedAt"> & { listenedAt: string }>;
    }
  | { ok: false; error: string };

/** Run sync/heavy parse off the Nest event loop so /health stays responsive. */
export function parseImportInWorker(
  source: ImportSource,
  stagedPath: string,
): Promise<ParsedListen[]> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const worker = new Worker(join(__dirname, "parse-worker.js"), {
      workerData: { source, stagedPath },
      resourceLimits: { maxOldGenerationSizeMb: WORKER_MAX_HEAP_MB },
    });

    const succeed = (listens: ParsedListen[]) => {
      if (settled) return;
      settled = true;
      resolve(listens);
    };

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      void worker.terminate().catch(() => {});
      reject(err);
    };

    worker.on("message", (msg: WorkerMsg) => {
      if (!msg || typeof msg !== "object" || !("ok" in msg)) {
        fail(new Error("Invalid parse worker response"));
        return;
      }
      if (!msg.ok) {
        fail(new ImportParseError(msg.error || "Parse failed"));
        return;
      }
      succeed(
        msg.listens.map((item) => ({
          ...item,
          listenedAt: new Date(item.listenedAt),
        })),
      );
    });
    worker.on("error", (err: NodeJS.ErrnoException) => {
      fail(
        err.code === "ERR_WORKER_OUT_OF_MEMORY"
          ? new ImportParseError("Import file is too large to parse")
          : err,
      );
    });
    worker.on("exit", (code) => {
      fail(
        new Error(
          code === 0
            ? "Parse worker exited without a result"
            : `Parse worker exited with code ${code}`,
        ),
      );
    });
  });
}
