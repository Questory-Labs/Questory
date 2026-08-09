type SseHandlers = {
  onMessage: (data: string) => void;
  onError?: (error: unknown) => void;
};

type SharedConnection = {
  subscribers: Set<(data: string) => void>;
  abortController: AbortController;
  running: boolean;
  releaseTimer?: ReturnType<typeof setTimeout>;
};

const RELEASE_GRACE_MS = 300;
const MAX_SSE_FAILURES = 6;
const SSE_PARK_MS = 60_000;

function waitForFocusOrDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const finish = (fn: () => void) => {
      clearTimeout(timer);
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", onFocus);
      }
      signal.removeEventListener("abort", onAbort);
      fn();
    };

    const onFocus = () => finish(resolve);
    const onAbort = () =>
      finish(() => reject(new DOMException("Aborted", "AbortError")));
    const timer = setTimeout(() => finish(resolve), ms);

    if (typeof window !== "undefined") {
      window.addEventListener("focus", onFocus);
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

const sharedConnections = new Map<string, SharedConnection>();

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

/** Parse one SSE event block (`data:` lines, ignore comments/heartbeats). */
function parseSseEvent(block: string): string | null {
  const dataLines: string[] = [];
  for (const line of block.split("\n")) {
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }
  if (dataLines.length === 0) return null;
  return dataLines.join("\n");
}

async function readSseStream(
  url: string,
  onMessage: (data: string) => void,
  signal: AbortSignal,
): Promise<void> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { Accept: "text/event-stream" },
    cache: "no-store",
    signal,
  });

  if (!res.ok) {
    throw new Error(`SSE failed: ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("SSE response has no body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const data = parseSseEvent(block);
      if (data != null && data !== "" && data !== "ping") {
        onMessage(data);
      }
      boundary = buffer.indexOf("\n\n");
    }
  }
}

async function runSharedConnection(url: string, conn: SharedConnection) {
  const broadcast = (data: string) => {
    for (const subscriber of conn.subscribers) {
      subscriber(data);
    }
  };

  let attempt = 0;
  while (!conn.abortController.signal.aborted && conn.subscribers.size > 0) {
    try {
      await readSseStream(url, broadcast, conn.abortController.signal);
      attempt = 0;
      if (conn.abortController.signal.aborted || conn.subscribers.size === 0) {
        return;
      }
      await delay(3_000, conn.abortController.signal);
    } catch {
      if (conn.abortController.signal.aborted) return;
      attempt += 1;
      if (attempt >= MAX_SSE_FAILURES) {
        await waitForFocusOrDelay(SSE_PARK_MS, conn.abortController.signal).catch(
          () => undefined,
        );
        if (conn.abortController.signal.aborted) return;
        attempt = 0;
        continue;
      }
      const waitMs = Math.min(30_000, 1_000 * 2 ** Math.min(attempt, 5));
      await delay(waitMs, conn.abortController.signal).catch(() => undefined);
    }
  }
}

function ensureSharedConnection(url: string): SharedConnection {
  let conn = sharedConnections.get(url);
  if (conn) return conn;

  conn = {
    subscribers: new Set(),
    abortController: new AbortController(),
    running: false,
  };
  sharedConnections.set(url, conn);
  return conn;
}

function startSharedConnection(url: string, conn: SharedConnection) {
  if (conn.running || conn.subscribers.size === 0) return;
  conn.running = true;
  void runSharedConnection(url, conn).finally(() => {
    conn.running = false;
    if (conn.subscribers.size === 0) {
      sharedConnections.delete(url);
    }
  });
}

function acquireSharedConnection(
  url: string,
  onMessage: (data: string) => void,
  signal: AbortSignal,
) {
  const conn = ensureSharedConnection(url);
  if (conn.releaseTimer) {
    clearTimeout(conn.releaseTimer);
    conn.releaseTimer = undefined;
  }
  conn.subscribers.add(onMessage);
  startSharedConnection(url, conn);

  const release = () => {
    const current = sharedConnections.get(url);
    if (!current) return;
    current.subscribers.delete(onMessage);
    if (current.subscribers.size > 0) return;
    if (current.releaseTimer) clearTimeout(current.releaseTimer);
    current.releaseTimer = setTimeout(() => {
      const live = sharedConnections.get(url);
      if (!live || live.subscribers.size > 0) return;
      live.releaseTimer = undefined;
      live.abortController.abort();
      sharedConnections.delete(url);
    }, RELEASE_GRACE_MS);
  };

  if (signal.aborted) {
    release();
    return;
  }
  signal.addEventListener("abort", release, { once: true });
}

/**
 * Cookie-authenticated SSE over fetch (EventSource cannot send credentials
 * cross-origin to the API on :4000 from the web app on :3000).
 */
export async function subscribeSse(
  url: string,
  handlers: SseHandlers,
  signal?: AbortSignal,
): Promise<void> {
  if (!signal || signal.aborted) return;

  await new Promise<void>((resolve) => {
    acquireSharedConnection(url, handlers.onMessage, signal);
    signal.addEventListener("abort", () => resolve(), { once: true });
  });
}

/** @internal test helper */
export function resetSharedSseConnectionsForTests() {
  for (const conn of sharedConnections.values()) {
    if (conn.releaseTimer) clearTimeout(conn.releaseTimer);
    conn.abortController.abort();
  }
  sharedConnections.clear();
}
