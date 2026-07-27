import { Worker } from "node:worker_threads";
import { join } from "path";
import type { ImportSource, ParsedListen } from "./parsers/types";

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
        fail(new Error(msg.error || "Parse failed"));
        return;
      }
      succeed(
        msg.listens.map((item) => ({
          ...item,
          listenedAt: new Date(item.listenedAt),
        })),
      );
    });
    worker.on("error", (err) => fail(err));
    worker.on("exit", (code) => {
      if (code !== 0) {
        fail(new Error(`Parse worker exited with code ${code}`));
      }
    });
  });
}
