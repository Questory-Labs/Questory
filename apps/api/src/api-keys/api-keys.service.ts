import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
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

@Injectable()
export class ApiKeysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
    private readonly scrobbler: ScrobblerConnections,
  ) {}

  list(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId, revokedAt: null },
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

    // One active key per type — rotate by revoking previous.
    await this.prisma.apiKey.updateMany({
      where: { userId, type, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    const { token, prefix, hash } = generateApiToken();
    const row = await this.prisma.apiKey.create({
      data: {
        userId,
        type,
        tokenHash: hash,
        tokenPrefix: prefix,
        label: input.label?.trim() || null,
      },
    });

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
