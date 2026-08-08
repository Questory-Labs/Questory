import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resetSharedSseConnectionsForTests,
  subscribeSse,
} from "./sse-client";

describe("subscribeSse", () => {
  afterEach(() => {
    resetSharedSseConnectionsForTests();
    vi.restoreAllMocks();
  });

  it("parses data frames from a fetch stream", async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode('data: {"ok":true}\n\ndata: ping\n\n'),
        );
        controller.close();
      },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, body }) as Response),
    );

    const messages: string[] = [];
    const ac = new AbortController();
    const done = subscribeSse(
      "http://localhost:4000/v1/test/stream",
      { onMessage: (data) => messages.push(data) },
      ac.signal,
    );

    await vi.waitFor(() => {
      expect(messages).toEqual(['{"ok":true}']);
    });

    ac.abort();
    await done;
  });

  it("shares one connection for duplicate subscribers", async () => {
    const encoder = new TextEncoder();
    const fetchMock = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 5));
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"ok":true}\n\n'));
        },
      });
      return { ok: true, body } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const ac1 = new AbortController();
    const ac2 = new AbortController();
    void subscribeSse(
      "http://localhost:4000/v1/shared/stream",
      { onMessage: () => {} },
      ac1.signal,
    );
    void subscribeSse(
      "http://localhost:4000/v1/shared/stream",
      { onMessage: () => {} },
      ac2.signal,
    );

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    ac1.abort();
    ac2.abort();
  });

  it("keeps the shared connection during a brief resubscribe gap", async () => {
    const encoder = new TextEncoder();
    const fetchMock = vi.fn(async () => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"ok":true}\n\n'));
        },
      });
      return { ok: true, body } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const ac1 = new AbortController();
    const ac2 = new AbortController();
    void subscribeSse(
      "http://localhost:4000/v1/grace/stream",
      { onMessage: () => {} },
      ac1.signal,
    );

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    ac1.abort();
    void subscribeSse(
      "http://localhost:4000/v1/grace/stream",
      { onMessage: () => {} },
      ac2.signal,
    );

    await new Promise((r) => setTimeout(r, 50));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    ac2.abort();
  });
});
