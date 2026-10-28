import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { mapQHttpError, probeJsonSafe } from "./qhttp-client";
import { QHttpError } from "@questorylabs/qhttp";

describe("mapQHttpError", () => {
  it("maps QHttpError status for parseApiError", () => {
    const err = new QHttpError("bad", { code: "HTTP_ERROR", httpStatus: 401 });
    const mapped = mapQHttpError(err);
    expect(mapped.status).toBe(401);
    expect(mapped.message).toBe("bad");
  });

  it("keeps the error body and the server request id", () => {
    const err = new QHttpError("Request failed with status 401", {
      code: "HTTP_ERROR",
      httpStatus: 401,
      result: {
        data: { statusCode: 401, message: "Invalid email or password", attemptsLeft: 2 },
        headers: { "X-Request-Id": "abc12345-def6" },
      },
    });
    const mapped = mapQHttpError(err);
    expect(mapped.data).toMatchObject({ attemptsLeft: 2 });
    expect(mapped.requestId).toBe("abc12345-def6");
  });

  it("falls back to the body request id and rejects malformed ids", () => {
    const fromBody = mapQHttpError(
      new QHttpError("x", {
        code: "HTTP_ERROR",
        httpStatus: 500,
        result: { data: { requestId: "req-0000-1111" }, headers: {} },
      }),
    );
    expect(fromBody.requestId).toBe("req-0000-1111");
    const bad = mapQHttpError(
      new QHttpError("x", {
        code: "HTTP_ERROR",
        httpStatus: 500,
        result: { data: {}, headers: { "x-request-id": "<script>" } },
      }),
    );
    expect(bad.requestId).toBeUndefined();
  });

  it("passes through generic errors", () => {
    const err = new Error("nope");
    expect(mapQHttpError(err).message).toBe("nope");
  });
});

describe("probeJsonSafe", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
  });

  afterEach(() => {
    vi.stubGlobal("fetch", originalFetch);
    vi.restoreAllMocks();
  });

  it("does not retry failed health probes", async () => {
    const result = await probeJsonSafe("http://localhost:4000/health");
    expect(result).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
