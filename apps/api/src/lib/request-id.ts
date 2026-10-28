import { randomUUID } from "node:crypto";
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

export const REQUEST_ID_HEADER = "x-request-id";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;

type RequestWithId = Request & { requestId?: string };

export function resolveRequestId(incoming: unknown): string {
  return typeof incoming === "string" && REQUEST_ID_PATTERN.test(incoming)
    ? incoming
    : randomUUID();
}

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const id = resolveRequestId(req.headers[REQUEST_ID_HEADER]);
  (req as RequestWithId).requestId = id;
  res.setHeader(REQUEST_ID_HEADER, id);
  next();
}

@Catch()
export class RequestIdExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("ExceptionsHandler");

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== "http") throw exception;
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<RequestWithId>();
    const res = ctx.getResponse<Response>();
    const requestId = req.requestId;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const payload =
        typeof body === "object" && body !== null
          ? { ...(body as Record<string, unknown>) }
          : { statusCode: status, message: body };
      if (res.headersSent) return;
      res.status(status).json(requestId ? { ...payload, requestId } : payload);
      return;
    }

    const err = exception instanceof Error ? exception : null;
    this.logger.error(
      `${err?.message ?? String(exception)}${requestId ? ` [requestId=${requestId}]` : ""}`,
      err?.stack,
    );
    if (res.headersSent) return;
    const payload = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Internal server error",
    };
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(requestId ? { ...payload, requestId } : payload);
  }
}
