import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  VERSION_NEUTRAL,
} from "@nestjs/common";
import { Request, Response } from "express";
import { AuthRegisterSchema, AuthCredentialsSchema } from "@questorylabs/shared";
import { AuthService } from "./auth.service";
import { AuthAbuseService } from "./abuse/auth-abuse.service";
import { clearSession, readSession, setSession } from "./session";
import { SteamAuthGuard } from "./auth.guard";
import { CurrentUser } from "./current-user.decorator";
import { openIdQueryFromRequest } from "./openid-query";
import { currencyFromCountry } from "../lib/currency";
import { isSteamIdAllowed } from "../lib/runtime-config";
import { clientIpFromRequest } from "./abuse/client-ip";

@Controller({ path: "auth", version: VERSION_NEUTRAL })
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly abuse: AuthAbuseService,
  ) {}

  @Get("signup-status")
  signupStatus() {
    return this.auth.getSignupStatus();
  }

  @Get("register-challenge")
  async registerChallenge(@Req() req: Request) {
    const ip = clientIpFromRequest(req);
    return this.abuse.issueChallenge("register", ip);
  }

  @Get("login-challenge")
  async loginChallenge(@Req() req: Request) {
    const ip = clientIpFromRequest(req);
    return this.abuse.issueChallenge("login", ip);
  }

  @Post("register")
  @HttpCode(200)
  async register(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    const ip = clientIpFromRequest(req);
    this.abuse.assertOriginAllowed(
      (req.headers.origin as string | undefined) ||
        (req.headers.referer as string | undefined),
    );

    const parsed = AuthRegisterSchema.safeParse(body);
    if (!parsed.success) {
      return { ok: false, error: "Unable to create account" };
    }
    const data = parsed.data;

    if (this.abuse.honeypotTripped(data)) {
      this.abuse.recordHoneypot("register");
      // Fake success — do not create a user
      return { ok: true, user: null };
    }

    await this.abuse.consumeChallenge({
      kind: "register",
      challengeId: data.challengeId,
      challengeToken: data.challengeToken,
      ip,
    });

    const email = data.email.trim().toLowerCase();
    await this.abuse.assertRegisterLimits(ip, email);

    const user = await this.auth.register(email, data.password);
    setSession(res, {
      userId: user.id,
      steamId: user.steamId,
    });
    const pub = this.auth.toPublicUser(user);
    return {
      ok: true,
      user: {
        ...pub,
        currency: currencyFromCountry(pub.countryCode),
      },
    };
  }

  @Post("login")
  @HttpCode(200)
  async login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    const ip = clientIpFromRequest(req);
    this.abuse.assertOriginAllowed(
      (req.headers.origin as string | undefined) ||
        (req.headers.referer as string | undefined),
    );

    const parsed = AuthCredentialsSchema.safeParse(body);
    if (!parsed.success) {
      throw new UnauthorizedException("Invalid email or password");
    }
    const data = parsed.data;

    if (this.abuse.honeypotTripped(data)) {
      this.abuse.recordHoneypot("login");
      throw new UnauthorizedException("Invalid email or password");
    }

    await this.abuse.consumeChallenge({
      kind: "login",
      challengeId: data.challengeId,
      challengeToken: data.challengeToken,
      ip,
    });

    const email = data.email.trim().toLowerCase();
    await this.abuse.assertLoginLimits(ip, email);

    try {
      const user = await this.auth.login(email, data.password);
      await this.abuse.clearLoginFailures(email);
      setSession(res, {
        userId: user.id,
        steamId: user.steamId,
      });
      const pub = this.auth.toPublicUser(user);
      return {
        ok: true,
        user: {
          ...pub,
          currency: currencyFromCountry(pub.countryCode),
        },
      };
    } catch (err) {
      await this.abuse.recordLoginFailure(ip, email);
      throw err;
    }
  }

  @Get("steam")
  steamLink(@Req() req: Request, @Res() res: Response) {
    const webOrigin = process.env.WEB_ORIGIN || "http://localhost:3000";
    const session = readSession(req);
    if (!session) {
      return res.redirect(`${webOrigin}/login`);
    }
    return res.redirect(this.auth.buildSteamLoginUrl());
  }

  @Get("steam/callback")
  async steamCallback(@Req() req: Request, @Res() res: Response) {
    const webOrigin = process.env.WEB_ORIGIN || "http://localhost:3000";
    const session = readSession(req);
    if (!session) {
      return res.redirect(`${webOrigin}/login`);
    }
    try {
      const query = openIdQueryFromRequest(req);
      const steamId = await this.auth.verifySteamOpenId(query);
      if (!isSteamIdAllowed(steamId)) {
        return res.redirect(
          `${webOrigin}/settings/connections?error=${encodeURIComponent("not_allowed")}`,
        );
      }
      const user = await this.auth.linkSteamToUser(session.userId, steamId);
      setSession(res, {
        userId: user.id,
        steamId: user.steamId,
      });
      return res.redirect(`${webOrigin}/settings/connections?linked=steam`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "auth_failed";
      return res.redirect(
        `${webOrigin}/settings/connections?error=${encodeURIComponent(message)}`,
      );
    }
  }

  @Get("me")
  async me(@Req() req: Request) {
    const session = readSession(req);
    if (!session) return { user: null };
    const user = await this.auth.getUser(session.userId);
    if (!user) return { user: null };
    const pub = this.auth.toPublicUser(user);
    return {
      user: {
        ...pub,
        currency: currencyFromCountry(pub.countryCode),
      },
    };
  }

  @Post("logout")
  @UseGuards(SteamAuthGuard)
  logout(@Res({ passthrough: true }) res: Response) {
    clearSession(res);
    return { ok: true };
  }

  @Get("session-check")
  @UseGuards(SteamAuthGuard)
  sessionCheck(
    @CurrentUser() user: { userId: string; steamId: string | null },
  ) {
    return user;
  }
}
