import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  VERSION_NEUTRAL,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { readSession } from "../auth/session";
import { QmonitorOauthService } from "./qmonitor-oauth.service";
import { QMONITOR_PENDING_COOKIE } from "./qmonitor.constants";

@Controller({ path: "oauth/qmonitor", version: VERSION_NEUTRAL })
export class QmonitorOauthController {
  constructor(private readonly oauth: QmonitorOauthService) {}

  /**
   * Machine clients hit this for discovery; browser consent lives on the web app.
   * Returns validation errors for bad query, or { ok, loginRequired }.
   */
  @Get("authorize")
  authorizeInfo(@Query() query: Record<string, string>, @Req() req: Request) {
    const parsed = this.oauth.parseAuthorizeQuery(query);
    const session = readSession(req);
    return {
      ok: true,
      client_id: parsed.client_id,
      redirect_uri: parsed.redirect_uri,
      loginRequired: !session,
      consentUrlPath: "/oauth/qmonitor/authorize",
    };
  }

  @Post("pending")
  @HttpCode(200)
  pending(@Req() req: Request, @Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const session = readSession(req);
    if (!session) throw new UnauthorizedException("Login required");
    const query = this.oauth.parseAuthorizeQuery(body);
    const { pending } = this.oauth.issuePending(session.userId, query);
    res.cookie(QMONITOR_PENDING_COOKIE, pending, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE === "true",
      maxAge: 1000 * 60 * 10,
      path: "/",
    });
    return { pending };
  }

  @Post("approve")
  @HttpCode(200)
  async approve(
    @Req() req: Request,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = readSession(req);
    if (!session) throw new UnauthorizedException("Login required");
    const cookiePending = req.cookies?.[QMONITOR_PENDING_COOKIE] as
      | string
      | undefined;
    const result = await this.oauth.approve(
      session.userId,
      body,
      cookiePending,
    );
    res.clearCookie(QMONITOR_PENDING_COOKIE, { path: "/" });
    return result;
  }

  @Post("decline")
  @HttpCode(200)
  decline(@Body() body: unknown) {
    const query = this.oauth.parseAuthorizeQuery(body);
    return { redirectTo: this.oauth.declineRedirect(query) };
  }

  @Post("token")
  @HttpCode(200)
  token(@Body() body: unknown) {
    return this.oauth.token(body);
  }

  @Post("revoke")
  @HttpCode(200)
  revoke(@Body() body: unknown) {
    return this.oauth.revoke(body);
  }
}
