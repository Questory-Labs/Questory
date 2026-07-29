import { describe, expect, it } from "vitest";
import { jsonRequestHeaders } from "./json-fetch";

describe("jsonRequestHeaders", () => {
  it("does not set Content-Type on GET", () => {
    const headers = jsonRequestHeaders({ method: "GET" }) as Record<
      string,
      string
    >;
    expect(headers["Content-Type"]).toBeUndefined();
  });

  it("sets Content-Type for JSON POST bodies", () => {
    const headers = jsonRequestHeaders({
      method: "POST",
      body: JSON.stringify({ ok: true }),
    }) as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("skips Content-Type for FormData", () => {
    const headers = jsonRequestHeaders({
      method: "POST",
      body: new FormData(),
    }) as Record<string, string>;
    expect(headers["Content-Type"]).toBeUndefined();
  });
});
