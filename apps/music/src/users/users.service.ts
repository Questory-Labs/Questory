import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { hashToken } from "../lib/tokens";

const LISTENBRAINZ = "listenbrainz";
const MUSIC_INGEST = "music_ingest";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUsername(username: string) {
    const account = await this.prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: LISTENBRAINZ,
          providerAccountId: username,
        },
      },
      include: { user: true },
    });
    return account?.user ?? null;
  }

  async getListenbrainzUsername(userId: string): Promise<string | null> {
    const account = await this.prisma.account.findFirst({
      where: { userId, provider: LISTENBRAINZ },
      select: { providerAccountId: true },
    });
    return account?.providerAccountId ?? null;
  }

  async findByTokenHash(tokenHash: string) {
    const key = await this.prisma.apiKey.findFirst({
      where: {
        tokenHash,
        type: MUSIC_INGEST,
        revokedAt: null,
      },
      include: { user: true },
    });
    if (!key) return null;

    await this.prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    });

    const username =
      (await this.getListenbrainzUsername(key.userId)) || key.user.personaName;

    return {
      id: key.user.id,
      personaName: key.user.personaName,
      username,
    };
  }

  async resolveSoleUser() {
    const users = await this.prisma.user.findMany({ take: 2 });
    if (users.length === 1) return users[0];
    return null;
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /** Convenience for token hashing at call sites that pass plaintext. */
  hashToken(token: string) {
    return hashToken(token);
  }
}
