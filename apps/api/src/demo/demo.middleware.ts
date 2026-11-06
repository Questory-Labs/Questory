import { HttpException, HttpStatus } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import {
  DEMO_READ_ONLY_CODE,
  DEMO_READ_ONLY_MESSAGE,
  DEMO_USER_ID,
  normalizeDemoPath,
} from "@questorylabs/shared";
import { clientIpFromRequest } from "../auth/abuse/client-ip";
import { clearSession, readSession } from "../auth/session";
import { demoUser } from "./demo-user";
import {
  DEMO_PASS_THROUGH_PATHS,
  findDemoRoute,
  isDemoStreamPath,
} from "./demo.routes";

const MAX_BODY_BYTES = 16 * 1024;

export type DemoFlags = { isDemoEnabled(): Promise<boolean> };
export type DemoLimits = { assertDemoRequestLimits(ip: string): Promise<void> };

async function readJsonBody(req: Request): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) return undefined;
    chunks.push(buffer);
  }
  if (chunks.length === 0) return undefined;
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return undefined;
  }
}

function deny(res: Response, status: number, message: string, code?: string) {
  res.status(status).json({ statusCode: status, message, ...(code ? { code } : {}) });
}

async function handleDemoRequest(
  req: Request,
  res: Response,
  next: NextFunction,
  flags: DemoFlags,
  limits: DemoLimits,
  exp: number,
) {
  const path = normalizeDemoPath(req.path);
  const method = req.method.toUpperCase();
  const isRead = method === "GET" || method === "HEAD";

  if (!(await flags.isDemoEnabled())) {
    clearSession(res, req);
    deny(res, 401, "Demo is not available");
    return;
  }
  if (isRead && DEMO_PASS_THROUGH_PATHS.has(path)) {
    next();
    return;
  }
  if (method === "POST" && path === "/auth/logout") {
    clearSession(res, req);
    res.status(201).json({ ok: true });
    return;
  }
  if (method === "POST" && path === "/auth/demo") {
    res.status(200).json({ ok: true, user: demoUser(exp) });
    return;
  }
  if (isRead && isDemoStreamPath(path)) {
    res.status(204).end();
    return;
  }

  const match = findDemoRoute(method, path);
  if (!match) {
    if (isRead) deny(res, 404, "Not available in the demo");
    else deny(res, 403, DEMO_READ_ONLY_MESSAGE, DEMO_READ_ONLY_CODE);
    return;
  }
  try {
    await limits.assertDemoRequestLimits(clientIpFromRequest(req));
  } catch (err) {
    if (err instanceof HttpException && err.getStatus() === HttpStatus.TOO_MANY_REQUESTS) {
      res.status(err.getStatus()).json(err.getResponse());
      return;
    }
    throw err;
  }
  const body = method === "POST" ? await readJsonBody(req) : undefined;
  const payload = match.route.respond({
    exp,
    params: match.params,
    query: req.query as Record<string, unknown>,
    body,
  });
  res.status(method === "POST" ? 201 : 200).json(payload);
}

export function createDemoMiddleware(flags: DemoFlags, limits: DemoLimits) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const session = readSession(req);
    if (!session) {
      next();
      return;
    }
    if (session.demo !== true && session.userId !== DEMO_USER_ID) {
      next();
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    try {
      await handleDemoRequest(req, res, next, flags, limits, session.exp);
    } catch {
      if (!res.headersSent) {
        clearSession(res, req);
        deny(res, 401, "Demo is not available");
      } else {
        res.end();
      }
    }
  };
}
