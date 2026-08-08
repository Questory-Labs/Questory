import { describe, expect, it, vi } from "vitest";
import { mapQHttpError } from "./qhttp-client";
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
