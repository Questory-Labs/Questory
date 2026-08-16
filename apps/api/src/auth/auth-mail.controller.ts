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
  UseGuards,
  VERSION_NEUTRAL,
} from "@nestjs/common";
import { Request, Response } from "express";
import {
  AuthEmailSchema,
  AuthResetPasswordSchema,
} from "@questorylabs/shared";
import { AuthMailService } from "./auth-mail.service";
import { AuthAbuseService } from "./abuse/auth-abuse.service";
import { AuthService } from "./auth.service";
import { setSession } from "./session";
import { SteamAuthGuard } from "./auth.guard";
import { CurrentUser } from "./current-user.decorator";
import { clientIpFromRequest } from "./abuse/client-ip";

function webOrigin(): string {
  return (process.env.WEB_ORIGIN || "http://localhost:3000").replace(/\/$/, "");
}

@Controller({ path: "auth", version: VERSION_NEUTRAL })
export class AuthMailController {
  constructor(
    private readonly mail: AuthMailService,
    private readonly abuse: AuthAbuseService,
    private readonly auth: AuthService,
  ) {}

  @Post("magic")
  @HttpCode(200)
  async requestMagic(@Req() req: Request, @Body() body: unknown) {
    this.mail.assertActive();
    this.abuse.assertOriginAllowed(
      (req.headers.origin as string | undefined) ||
        (req.headers.referer as string | undefined),
    );
    const parsed = AuthEmailSchema.safeParse(body);
    if (parsed.success) {
      const ip = clientIpFromRequest(req);
      const email = parsed.data.email.trim().toLowerCase();
      await this.abuse.assertMailSendLimits(ip, email);
      await this.mail.requestMagic(email);
    }
    return { ok: true };
  }

  @Get("magic/callback")
  async magicCallback(
    @Query("token") token: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const origin = webOrigin();
    try {
      if (!token) throw new UnauthorizedException("Invalid or expired link");
      const user = await this.mail.consumeMagic(token);
      setSession(
        res,
        {
          userId: user.id,
          steamId: user.steamId,
          epoch: user.sessionEpoch ?? 0,
        },
        req,
      );
      const next = user.passwordHash ? "/dashboard" : "/set-password";
      return res.redirect(`${origin}${next}`);
    } catch {
      return res.redirect(`${origin}/login?error=invalid_link`);
    }
  }

  @Post("verify/resend")
  @HttpCode(200)
  @UseGuards(SteamAuthGuard)
  async resendVerify(
    @Req() req: Request,
    @CurrentUser() session: { userId: string },
  ) {
    this.mail.assertActive();
    const ip = clientIpFromRequest(req);
    const user = await this.auth.getUser(session.userId);
    if (user?.email) {
      await this.abuse.assertMailSendLimits(ip, user.email);
      await this.mail.sendVerifyForUser(session.userId);
    }
    return { ok: true };
  }

  @Get("verify/callback")
  async verifyCallback(
    @Query("token") token: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const origin = webOrigin();
    try {
      if (!token) throw new UnauthorizedException("Invalid or expired link");
      const user = await this.mail.consumeVerify(token);
      setSession(
        res,
        {
          userId: user.id,
          steamId: user.steamId,
          epoch: user.sessionEpoch ?? 0,
        },
        req,
      );
      return res.redirect(`${origin}/dashboard`);
    } catch {
      return res.redirect(`${origin}/verify?error=invalid_link`);
    }
  }

  @Post("forgot")
  @HttpCode(200)
  async forgot(@Req() req: Request, @Body() body: unknown) {
    this.mail.assertActive();
    this.abuse.assertOriginAllowed(
      (req.headers.origin as string | undefined) ||
        (req.headers.referer as string | undefined),
    );
    const parsed = AuthEmailSchema.safeParse(body);
    if (parsed.success) {
      const ip = clientIpFromRequest(req);
      const email = parsed.data.email.trim().toLowerCase();
      await this.abuse.assertMailSendLimits(ip, email);
      await this.mail.requestReset(email);
    }
    return { ok: true };
  }

  @Post("reset")
  @HttpCode(200)
  async reset(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    this.mail.assertActive();
    const parsed = AuthResetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      throw new UnauthorizedException("Invalid or expired link");
    }
    const user = await this.mail.consumeReset(
      parsed.data.token,
      parsed.data.password,
    );
    setSession(
      res,
      {
        userId: user.id,
        steamId: user.steamId,
        epoch: user.sessionEpoch ?? 0,
      },
      req,
    );
    return { ok: true };
  }
}
