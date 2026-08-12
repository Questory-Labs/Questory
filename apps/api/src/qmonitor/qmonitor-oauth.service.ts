import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import {
  QmonitorApproveSchema,
  QmonitorAuthorizeQuerySchema,
  QmonitorRevokeSchema,
  QmonitorTokenRequestSchema,
  type QmonitorAuthorizeQuery,
} from "@questorylabs/shared";
import { PrismaService } from "../prisma/prisma.service";
import { QMONITOR_AUTH_CODE_TTL_MS } from "./qmonitor.constants";
import {
  generateOpaqueToken,
  hashDeviceId,
  hashOpaqueToken,
  pkceS256Challenge,
  safeEqualStr,
  signAccessToken,
  verifyAccessToken,
} from "./qmonitor-crypto";
import {
  signQmonitorPending,
  verifyQmonitorPending,
} from "./qmonitor-pending";

@Injectable()
export class QmonitorOauthService {
  constructor(private readonly prisma: PrismaService) {}

  parseAuthorizeQuery(query: unknown): QmonitorAuthorizeQuery {
    const parsed = QmonitorAuthorizeQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return parsed.data;
  }

  issuePending(
    userId: string,
    query: QmonitorAuthorizeQuery,
  ): { pending: string } {
    return {
      pending: signQmonitorPending({
        userId,
        state: query.state,
        redirectUri: query.redirect_uri,
        deviceId: query.device_id,
        codeChallenge: query.code_challenge,
      }),
    };
  }

  async approve(userId: string, body: unknown, pendingFromCookie?: string) {
    const parsed = QmonitorApproveSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const pendingRaw = parsed.data.pending || pendingFromCookie;
    const pending = verifyQmonitorPending(pendingRaw);
    if (!pending || pending.userId !== userId) {
      throw new UnauthorizedException("Invalid or expired consent");
    }

    const code = generateOpaqueToken(32);
    const codeHash = hashOpaqueToken(code);
    const deviceIdHash = hashDeviceId(pending.deviceId);
    const expiresAt = new Date(Date.now() + QMONITOR_AUTH_CODE_TTL_MS);

    await this.prisma.qmonitorAuthCode.create({
      data: {
        codeHash,
        userId,
        deviceIdHash,
        codeChallenge: pending.codeChallenge,
        redirectUri: pending.redirectUri,
        state: pending.state,
        expiresAt,
      },
    });

    const url = new URL(pending.redirectUri);
    url.searchParams.set("code", code);
    url.searchParams.set("state", pending.state);

    return {
      redirectTo: url.toString(),
      state: pending.state,
    };
  }

  declineRedirect(query: QmonitorAuthorizeQuery): string {
    const url = new URL(query.redirect_uri);
    url.searchParams.set("error", "access_denied");
    url.searchParams.set("state", query.state);
    return url.toString();
  }

  async token(body: unknown) {
    const parsed = QmonitorTokenRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const data = parsed.data;
    if (data.grant_type === "authorization_code") {
      return this.exchangeCode(data);
    }
    return this.refresh(data);
  }

  private async exchangeCode(data: {
    code: string;
    redirect_uri: string;
    code_verifier: string;
    device_id: string;
  }) {
    const codeHash = hashOpaqueToken(data.code);
    const row = await this.prisma.qmonitorAuthCode.findUnique({
      where: { codeHash },
    });
    if (!row || row.consumedAt || row.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException("Invalid authorization code");
    }
    if (row.redirectUri !== data.redirect_uri) {
      throw new UnauthorizedException("redirect_uri mismatch");
    }
    const deviceIdHash = hashDeviceId(data.device_id);
    if (!safeEqualStr(row.deviceIdHash, deviceIdHash)) {
      throw new UnauthorizedException("device_id mismatch");
    }
    const challenge = pkceS256Challenge(data.code_verifier);
    if (!safeEqualStr(row.codeChallenge, challenge)) {
      throw new UnauthorizedException("PKCE verification failed");
    }

    await this.prisma.qmonitorAuthCode.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    });

    return this.mintTokens(row.userId, deviceIdHash);
  }

  private async refresh(data: { refresh_token: string; device_id: string }) {
    const refreshTokenHash = hashOpaqueToken(data.refresh_token);
    const deviceIdHash = hashDeviceId(data.device_id);
    const session = await this.prisma.qmonitorDeviceSession.findFirst({
      where: { refreshTokenHash, revokedAt: null },
    });
    if (!session) {
      throw new UnauthorizedException("Invalid refresh token");
    }
    if (!safeEqualStr(session.deviceIdHash, deviceIdHash)) {
      throw new UnauthorizedException("device_id mismatch");
    }

    await this.prisma.qmonitorDeviceSession.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });

    const accessToken = signAccessToken({
      sub: session.userId,
      sid: session.id,
    });
    return {
      token_type: "Bearer",
      access_token: accessToken,
      expires_in: Math.floor(
        ((verifyAccessToken(accessToken)?.exp ?? Date.now()) - Date.now()) /
          1000,
      ),
    };
  }

  private async mintTokens(userId: string, deviceIdHash: string, label?: string) {
    const refreshToken = generateOpaqueToken(32);
    const refreshTokenHash = hashOpaqueToken(refreshToken);

    const existing = await this.prisma.qmonitorDeviceSession.findUnique({
      where: {
        userId_deviceIdHash: { userId, deviceIdHash },
      },
    });

    let sessionId: string;
    if (existing) {
      const updated = await this.prisma.qmonitorDeviceSession.update({
        where: { id: existing.id },
        data: {
          refreshTokenHash,
          revokedAt: null,
          lastUsedAt: new Date(),
          ...(label ? { label } : {}),
        },
      });
      sessionId = updated.id;
    } else {
      const created = await this.prisma.qmonitorDeviceSession.create({
        data: {
          userId,
          deviceIdHash,
          refreshTokenHash,
          label: label ?? null,
        },
      });
      sessionId = created.id;
    }

    const accessToken = signAccessToken({ sub: userId, sid: sessionId });
    const claims = verifyAccessToken(accessToken)!;
    return {
      token_type: "Bearer",
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: Math.floor((claims.exp - Date.now()) / 1000),
    };
  }

  async revoke(body: unknown) {
    const parsed = QmonitorRevokeSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const { token, token_type_hint, device_id } = parsed.data;

    if (token_type_hint !== "access_token") {
      const refreshTokenHash = hashOpaqueToken(token);
      const session = await this.prisma.qmonitorDeviceSession.findFirst({
        where: { refreshTokenHash, revokedAt: null },
      });
      if (session) {
        if (device_id) {
          const deviceIdHash = hashDeviceId(device_id);
          if (!safeEqualStr(session.deviceIdHash, deviceIdHash)) {
            throw new UnauthorizedException("device_id mismatch");
          }
        }
        await this.prisma.qmonitorDeviceSession.update({
          where: { id: session.id },
          data: { revokedAt: new Date() },
        });
        return { ok: true };
      }
    }

    const claims = verifyAccessToken(token);
    if (claims) {
      await this.prisma.qmonitorDeviceSession.updateMany({
        where: { id: claims.sid, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { ok: true };
  }

  async resolveAccessUser(authorization?: string) {
    const raw = authorization?.replace(/^Bearer\s+/i, "").trim();
    const claims = verifyAccessToken(raw);
    if (!claims) {
      throw new UnauthorizedException("Invalid access token");
    }
    const session = await this.prisma.qmonitorDeviceSession.findFirst({
      where: { id: claims.sid, userId: claims.sub, revokedAt: null },
    });
    if (!session) {
      throw new UnauthorizedException("Session revoked");
    }
    return { userId: claims.sub, sessionId: claims.sid };
  }
}
