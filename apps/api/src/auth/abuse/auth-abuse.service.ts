import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { CacheService } from "../../cache/cache.service";
import { resolveSessionSecret } from "@questorylabs/shared/session";
import type { AbuseLimit, AuthChallengeKind } from "@questorylabs/shared";

const CHALLENGE_TTL_MS = 10 * 60 * 1000;

function minFillMs(): number {
  const raw = Number(process.env.AUTH_MIN_FILL_MS);
  if (Number.isFinite(raw) && raw >= 0) return raw;
  return 2_000;
}

const LIMITS = {
  registerIpHour: { max: 5, ttl: 3600 },
  registerIpDay: { max: 15, ttl: 86400 },
  registerEmailDay: { max: 3, ttl: 86400 },
  loginIp: { max: 20, ttl: 900 },
  loginEmail: { max: 8, ttl: 900 },
  challengeIp: { max: 40, ttl: 900 },
} as const;

export const LOGIN_LOCKOUT_TIERS = [
  { fails: 5, cooldownSec: 60 },
  { fails: 10, cooldownSec: 5 * 60 },
  { fails: 20, cooldownSec: 15 * 60 },
] as const;

export type LoginFailureState = {
  attemptsLeft: number;
  retryAfterSec?: number;
};

type AbuseMetrics = {
  honeypotRegister: number;
  honeypotLogin: number;
  challengeFail: number;
  rateLimited: number;
  loginLockout: number;
  originReject: number;
};

@Injectable()
export class AuthAbuseService {
  private readonly logger = new Logger(AuthAbuseService.name);
  private readonly metrics: AbuseMetrics = {
    honeypotRegister: 0,
    honeypotLogin: 0,
    challengeFail: 0,
    rateLimited: 0,
    loginLockout: 0,
    originReject: 0,
  };

  constructor(private readonly cache: CacheService) {}

  hashIp(ip: string): string {
    return createHash("sha256").update(ip).digest("hex").slice(0, 32);
  }

  hashEmail(email: string): string {
    return createHash("sha256").update(email).digest("hex").slice(0, 32);
  }

  challengeSecret(): string {
    return (
      (process.env.AUTH_CHALLENGE_SECRET || "").trim() || resolveSessionSecret()
    );
  }

  assertOriginAllowed(originOrReferer: string | undefined): void {
    const allowed = this.allowedOrigins();
    if (!originOrReferer) {
      this.metrics.originReject += 1;
      throw new ForbiddenException("Invalid origin");
    }
    let host: string;
    try {
      host = new URL(originOrReferer).origin;
    } catch {
      this.metrics.originReject += 1;
      throw new ForbiddenException("Invalid origin");
    }
    if (!allowed.has(host)) {
      this.metrics.originReject += 1;
      throw new ForbiddenException("Invalid origin");
    }
  }

  private allowedOrigins(): Set<string> {
    const set = new Set<string>();
    const web = (process.env.WEB_ORIGIN || "http://localhost:3000").trim();
    try {
      set.add(new URL(web).origin);
    } catch {
      set.add("http://localhost:3000");
    }
    const extras = (process.env.AUTH_ALLOWED_ORIGINS || "")
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const e of extras) {
      try {
        set.add(new URL(e).origin);
      } catch {
        // ignore
      }
    }
    return set;
  }

  async issueChallenge(
    kind: AuthChallengeKind,
    ip: string,
  ): Promise<{
    challengeId: string;
    issuedAt: number;
    expiresAt: number;
    token: string;
  }> {
    await this.hitLimit(
      `auth:challenge:ip:${this.hashIp(ip)}`,
      LIMITS.challengeIp.max,
      LIMITS.challengeIp.ttl,
    );

    const challengeId = randomBytes(16).toString("base64url");
    const issuedAt = Date.now();
    const expiresAt = issuedAt + CHALLENGE_TTL_MS;
    const ipHash = this.hashIp(ip);
    const nonce = randomBytes(8).toString("base64url");
    const token = this.signChallenge({
      kind,
      challengeId,
      issuedAt,
      ipHash,
      nonce,
    });

    await this.cache.setString(
      `auth:challenge:${kind}:${challengeId}`,
      JSON.stringify({ kind, issuedAt, ipHash, nonce, used: false }),
      Math.ceil(CHALLENGE_TTL_MS / 1000),
    );

    return { challengeId, issuedAt, expiresAt, token };
  }

  async consumeChallenge(opts: {
    kind: AuthChallengeKind;
    challengeId: string;
    challengeToken: string;
    ip: string;
  }): Promise<void> {
    const key = `auth:challenge:${opts.kind}:${opts.challengeId}`;
    const raw = await this.cache.getString(key);
    if (!raw) {
      this.metrics.challengeFail += 1;
      throw new BadRequestException("Invalid or expired challenge");
    }

    let stored: {
      kind: AuthChallengeKind;
      issuedAt: number;
      ipHash: string;
      nonce: string;
      used?: boolean;
    };
    try {
      stored = JSON.parse(raw);
    } catch {
      this.metrics.challengeFail += 1;
      throw new BadRequestException("Invalid or expired challenge");
    }

    if (stored.kind !== opts.kind) {
      this.metrics.challengeFail += 1;
      throw new BadRequestException("Invalid or expired challenge");
    }

    const ipHash = this.hashIp(opts.ip);
    if (stored.ipHash !== ipHash) {
      this.metrics.challengeFail += 1;
      throw new BadRequestException("Invalid or expired challenge");
    }

    const expected = this.signChallenge({
      kind: stored.kind,
      challengeId: opts.challengeId,
      issuedAt: stored.issuedAt,
      ipHash: stored.ipHash,
      nonce: stored.nonce,
    });
    if (!safeEqual(expected, opts.challengeToken)) {
      this.metrics.challengeFail += 1;
      throw new BadRequestException("Invalid or expired challenge");
    }

    if (Date.now() - stored.issuedAt < minFillMs()) {
      this.metrics.challengeFail += 1;
      throw new BadRequestException("Please try again");
    }

    if (Date.now() - stored.issuedAt > CHALLENGE_TTL_MS) {
      this.metrics.challengeFail += 1;
      throw new BadRequestException("Invalid or expired challenge");
    }

    // Single-use: delete before proceeding
    await this.cache.del(key);
  }

  /** Returns true if honeypot tripped (caller should fake success / fake fail). */
  honeypotTripped(fields: {
    website?: string;
    company?: string;
    username?: string;
  }): boolean {
    const filled = [fields.website, fields.company, fields.username].some(
      (v) => typeof v === "string" && v.trim().length > 0,
    );
    return filled;
  }

  recordHoneypot(kind: AuthChallengeKind): void {
    if (kind === "register") this.metrics.honeypotRegister += 1;
    else this.metrics.honeypotLogin += 1;
    this.logger.warn(`abuse.honeypot kind=${kind}`);
  }

  async assertRegisterLimits(ip: string, email: string): Promise<void> {
    const ipH = this.hashIp(ip);
    const emailH = this.hashEmail(email);
    await this.hitLimit(
      `auth:register:ip:h:${ipH}`,
      LIMITS.registerIpHour.max,
      LIMITS.registerIpHour.ttl,
    );
    await this.hitLimit(
      `auth:register:ip:d:${ipH}`,
      LIMITS.registerIpDay.max,
      LIMITS.registerIpDay.ttl,
    );
    await this.hitLimit(
      `auth:register:email:d:${emailH}`,
      LIMITS.registerEmailDay.max,
      LIMITS.registerEmailDay.ttl,
    );
  }

  async assertLoginLimits(ip: string, email: string): Promise<void> {
    const ipH = this.hashIp(ip);
    const emailH = this.hashEmail(email);
    await this.hitLimit(
      `auth:login:ip:${ipH}`,
      LIMITS.loginIp.max,
      LIMITS.loginIp.ttl,
    );
    await this.hitLimit(
      `auth:login:email:${emailH}`,
      LIMITS.loginEmail.max,
      LIMITS.loginEmail.ttl,
    );
    await this.assertLoginLockout(ip, email);
  }

  async recordLoginFailure(
    ip: string,
    email: string,
  ): Promise<LoginFailureState> {
    const ipH = this.hashIp(ip);
    const emailH = this.hashEmail(email);
    const ipFails = await this.cache.incr(`auth:login:fail:ip:${ipH}`, 900);
    const emailFails = await this.cache.incr(
      `auth:login:fail:email:${emailH}`,
      900,
    );
    const cooldown = Math.max(
      this.cooldownSeconds(ipFails),
      this.cooldownSeconds(emailFails),
    );
    const attemptsLeft = this.attemptsBeforeLockout(
      Math.max(ipFails, emailFails),
    );
    if (cooldown > 0) {
      const until = String(Date.now() + cooldown * 1000);
      await this.cache.setString(`auth:login:lock:ip:${ipH}`, until, cooldown);
      await this.cache.setString(
        `auth:login:lock:email:${emailH}`,
        until,
        cooldown,
      );
      this.metrics.loginLockout += 1;
      return { attemptsLeft: 0, retryAfterSec: cooldown };
    }
    return { attemptsLeft };
  }

  async clearLoginFailures(email: string): Promise<void> {
    const emailH = this.hashEmail(email);
    await this.cache.del(`auth:login:fail:email:${emailH}`);
    await this.cache.del(`auth:login:lock:email:${emailH}`);
  }

  getMetrics(): AbuseMetrics {
    return { ...this.metrics };
  }

  getLimits(): AbuseLimit[] {
    return Object.entries(LIMITS).map(([key, limit]) => ({
      key,
      max: limit.max,
      windowSeconds: limit.ttl,
    }));
  }

  private async assertLoginLockout(ip: string, email: string): Promise<void> {
    const ipH = this.hashIp(ip);
    const emailH = this.hashEmail(email);
    const locks = [
      await this.cache.getString(`auth:login:lock:ip:${ipH}`),
      await this.cache.getString(`auth:login:lock:email:${emailH}`),
    ].filter((v): v is string => Boolean(v));
    if (locks.length) {
      this.metrics.loginLockout += 1;
      const retryAfterSec = Math.max(
        ...locks.map((v) => this.lockRemainingSeconds(v)),
      );
      throw new HttpException(
        {
          statusCode: 429,
          message: "Too many attempts, try again later",
          retryAfter: retryAfterSec,
          retryAfterSec,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private lockRemainingSeconds(value: string): number {
    const until = Number(value);
    if (!Number.isFinite(until) || until < 1e12) {
      return LOGIN_LOCKOUT_TIERS[0].cooldownSec;
    }
    return Math.max(1, Math.ceil((until - Date.now()) / 1000));
  }

  private cooldownSeconds(fails: number): number {
    let cooldown = 0;
    for (const tier of LOGIN_LOCKOUT_TIERS) {
      if (fails >= tier.fails) cooldown = tier.cooldownSec;
    }
    return cooldown;
  }

  private attemptsBeforeLockout(fails: number): number {
    const next = LOGIN_LOCKOUT_TIERS.find((t) => fails < t.fails);
    return next ? next.fails - fails : 0;
  }

  private async hitLimit(
    key: string,
    max: number,
    ttlSeconds: number,
  ): Promise<void> {
    const count = await this.cache.incr(key, ttlSeconds);
    if (count > max) {
      this.metrics.rateLimited += 1;
      throw new HttpException(
        {
          statusCode: 429,
          message: "Too many attempts, try again later",
          retryAfter: ttlSeconds,
          retryAfterSec: ttlSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private signChallenge(payload: {
    kind: AuthChallengeKind;
    challengeId: string;
    issuedAt: number;
    ipHash: string;
    nonce: string;
  }): string {
    const body = [
      payload.kind,
      payload.challengeId,
      String(payload.issuedAt),
      payload.ipHash,
      payload.nonce,
    ].join("|");
    return createHmac("sha256", this.challengeSecret())
      .update(body)
      .digest("base64url");
  }
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
