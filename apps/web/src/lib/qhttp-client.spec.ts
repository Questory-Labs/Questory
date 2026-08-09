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
