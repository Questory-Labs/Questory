import { describe, expect, it, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";
import {
  REQUEST_ID_HEADER,
  RequestIdExceptionFilter,
  requestIdMiddleware,
  resolveRequestId,
} from "../../src/lib/request-id";

const host = (req: any, res: any) =>
  ({
    getType: () => "http",
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  }) as any;

const response = () => {
  const res: any = { headersSent: false };
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

describe("request id", () => {
  it("keeps safe incoming ids and replaces unsafe ones", () => {
    expect(resolveRequestId("abcd-1234-efgh")).toBe("abcd-1234-efgh");
    expect(resolveRequestId("bad id\r\nx")).not.toBe("bad id\r\nx");
    expect(resolveRequestId("short")).toMatch(/^[0-9a-f-]{36}$/);
    expect(resolveRequestId(["a", "b"])).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("sets the header and request field", () => {
    const req: any = { headers: { [REQUEST_ID_HEADER]: "req-12345678" } };
    const res: any = { setHeader: vi.fn() };
    const next = vi.fn();
    requestIdMiddleware(req, res, next);
    expect(req.requestId).toBe("req-12345678");
    expect(res.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, "req-12345678");
    expect(next).toHaveBeenCalled();
  });

  it("adds requestId to http error bodies", () => {
    const res = response();
    new RequestIdExceptionFilter().catch(
      new BadRequestException("nope"),
      host({ requestId: "req-12345678" }, res),
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "nope", requestId: "req-12345678" }),
    );
  });

  it("hides unknown error details", () => {
    const res = response();
    const filter = new RequestIdExceptionFilter();
    vi.spyOn((filter as any).logger, "error").mockImplementation(() => {});
    filter.catch(new Error("db password leaked"), host({ requestId: "req-12345678" }, res));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 500,
      message: "Internal server error",
      requestId: "req-12345678",
    });
  });
});
