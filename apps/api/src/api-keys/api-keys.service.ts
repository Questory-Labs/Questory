import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  PublicApiKeyCreateSchema,
  type PublicApiKey,
  type PublicApiKeyCreated,
} from "@questorylabs/shared";
import { PrismaService } from "../prisma/prisma.service";
import {
  API_KEY_TYPE,
  API_KEY_TYPES,
  type ApiKeyType,
} from "../accounts/account.constants";
import {
  AccountsService,
  generateApiToken,
} from "../accounts/accounts.service";
import { LB_NATIVE_DISABLED_ERROR } from "../music/scrobbler/scrobbler.constants";
import { ScrobblerConnections } from "../music/scrobbler/scrobbler.connections";
import { parseApiKeyScopes } from "../auth/api-key.guard";

const MAX_PUBLIC_KEYS_PER_USER = 20;

@Injectable()
export class ApiKeysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
    private readonly scrobbler: ScrobblerConnections,
  ) {}

  list(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId, revokedAt: null, type: { not: API_KEY_TYPE.public } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        tokenPrefix: true,
        label: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });
  }

  async create(
    userId: string,
    input: { type: string; label?: string | null },
  ) {
    if (!API_KEY_TYPES.includes(input.type as ApiKeyType)) {
      throw new BadRequestException(
        `Invalid type. Expected one of: ${API_KEY_TYPES.join(", ")}`,
      );
    }
    const type = input.type as ApiKeyType;
    if (type === API_KEY_TYPE.public) {
      throw new BadRequestException("Use POST /api-keys/public for public keys");
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    if (type === API_KEY_TYPE.musicIngest) {
      if (await this.scrobbler.hasNative(userId)) {
        throw new ForbiddenException({
          code: 403,
          error: LB_NATIVE_DISABLED_ERROR,
        });
      }
      await this.accounts.ensureListenbrainzAccount(userId, user.personaName);
    }

    const { token, prefix, hash } = generateApiToken();
    const label = input.label?.trim() || null;

    // One active key per type — rotate by revoking previous.
    const [, row] = await this.prisma.$transaction([
      this.prisma.apiKey.updateMany({
        where: { userId, type, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.apiKey.create({
        data: {
          userId,
          type,
          tokenHash: hash,
          tokenPrefix: prefix,
          label,
        },
      }),
    ]);

    const listenbrainzUsername =
      type === API_KEY_TYPE.musicIngest
        ? await this.accounts.getListenbrainzUsername(userId)
        : null;

    return {
      id: row.id,
      type: row.type,
      tokenPrefix: row.tokenPrefix,
      label: row.label,
      createdAt: row.createdAt,
      /** Plaintext — shown once. */
      token,
      listenbrainzUsername,
    };
  }

  async listPublic(userId: string): Promise<PublicApiKey[]> {
    const rows = await this.prisma.apiKey.findMany({
      where: { userId, revokedAt: null, type: API_KEY_TYPE.public },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        tokenPrefix: true,
        label: true,
        scopes: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });
    return rows.map((row) => ({
      id: row.id,
      label: row.label,
      tokenPrefix: row.tokenPrefix,
      scopes: parseApiKeyScopes(row.scopes),
      createdAt: row.createdAt.toISOString(),
      lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    }));
  }

  async createPublic(userId: string, input: unknown): Promise<PublicApiKeyCreated> {
    const parsed = PublicApiKeyCreateSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message || "Invalid public API key request",
      );
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    const active = await this.prisma.apiKey.count({
      where: { userId, revokedAt: null, type: API_KEY_TYPE.public },
    });
    if (active >= MAX_PUBLIC_KEYS_PER_USER) {
      throw new BadRequestException(
        `At most ${MAX_PUBLIC_KEYS_PER_USER} active public API keys; revoke one first`,
      );
    }

    const scopes = [...new Set(parsed.data.scopes)];
    const { token, prefix, hash } = generateApiToken();
    const row = await this.prisma.apiKey.create({
      data: {
        userId,
        type: API_KEY_TYPE.public,
        tokenHash: hash,
        tokenPrefix: prefix,
        label: parsed.data.label,
        scopes: JSON.stringify(scopes),
      },
    });
    return {
      id: row.id,
      label: row.label,
      tokenPrefix: row.tokenPrefix,
      scopes,
      createdAt: row.createdAt.toISOString(),
      lastUsedAt: null,
      token,
    };
  }

  async revoke(userId: string, id: string) {
    const key = await this.prisma.apiKey.findFirst({
      where: { id, userId, revokedAt: null },
    });
    if (!key) throw new NotFoundException("API key not found");
    await this.prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async identity(userId: string) {
    const [steamId, listenbrainzUsername, keys, nativeScrobbling] =
      await Promise.all([
        this.accounts.getSteamId(userId),
        this.accounts.getListenbrainzUsername(userId),
        this.list(userId),
        this.scrobbler.hasNative(userId),
      ]);
    return { steamId, listenbrainzUsername, keys, nativeScrobbling };
  }
}
