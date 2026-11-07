import { Controller, Get, Header, NotFoundException, Param, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import type { PublicRewindShare } from "@questorylabs/shared";
import { AuthAbuseService } from "../auth/abuse/auth-abuse.service";
import { clientIpFromRequest } from "../auth/abuse/client-ip";
import { RewindShareService } from "./rewind-share.service";

@Controller("share")
export class RewindSharePublicController {
  constructor(
    private readonly shares: RewindShareService,
    private readonly abuse: AuthAbuseService,
  ) {}

  @Get("rewind/:token")
  @Header("Cache-Control", "no-store")
  async rewind(
    @Req() req: Request,
    @Param("token") token: string,
    @Query("view") view?: string,
  ): Promise<PublicRewindShare> {
    return this.limitMisses(req, () =>
      this.shares.resolveShare(token, { countView: view === "1" }),
    );
  }

  @Get("badge/:token")
  async badge(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param("token") token: string,
  ): Promise<string> {
    const svg = await this.limitMisses(req, () =>
      this.shares.resolveBadge(token.replace(/\.svg$/i, "")),
    );
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'");
    return svg;
  }

  private async limitMisses<T>(req: Request, run: () => Promise<T>): Promise<T> {
    const ip = clientIpFromRequest(req);
    await this.abuse.assertShareMissBudget(ip);
    try {
      return await run();
    } catch (err) {
      if (err instanceof NotFoundException) await this.abuse.recordShareMiss(ip);
      throw err;
    }
  }
}
