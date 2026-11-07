import type { NextFunction, Request, Response } from "express";

export const PUBLIC_API_PREFIX = "/public/v1";

export function publicApiCorsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const path = (req.originalUrl || req.url || "").split("?")[0];
  if (!path.startsWith(PUBLIC_API_PREFIX)) return next();
  if (req.method !== "GET" && req.method !== "OPTIONS" && req.method !== "HEAD") {
    return next();
  }
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Max-Age", "600");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  next();
}
