import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { FAMILY_MEMBER_LIMIT } from "@questorylabs/shared";
import { PrismaService } from "../prisma/prisma.service";
import { SteamApiService } from "../steam/steam-api.service";
import { AccountsService } from "../accounts/accounts.service";
import { FamilyService } from "./family.service";

const STEAM_ID64 = /^\d{17}$/;

@Injectable()
export class FamilyMembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly steam: SteamApiService,
    private readonly accounts: AccountsService,
    private readonly family: FamilyService,
  ) {}

  async addMember(userId: string, steamId: string) {
    const id = steamId.trim();
    if (!STEAM_ID64.test(id)) {
      throw new BadRequestException("SteamID64 must be a 17-digit number");
    }

    const group = await this.family.getOrCreate(userId);
    const already = group.members.some((m) => m.steamId === id);
    if (!already) {
      this.assertRoom(group.members.length, 1);
    }

    const [summary] = await this.steam.getPlayerSummaries([id]);
    return this.upsertMember(
      group.id,
      id,
      {
        personaName: summary?.personaname || id,
        avatarUrl: summary?.avatarfull || null,
      },
      { syncLibrary: true },
    );
  }

  /** Import selected Steam friends into the family group (must already be friendships). */
  async importFromFriends(userId: string, steamIds: string[]) {
    const ids = [
      ...new Set((steamIds || []).map((s) => s.trim()).filter(Boolean)),
    ];
    if (!ids.length) {
      throw new BadRequestException("Select at least one friend");
    }
    if (ids.length > FAMILY_MEMBER_LIMIT) {
      throw new BadRequestException(
        `Import at most ${FAMILY_MEMBER_LIMIT} friends at a time`,
      );
    }
    if (ids.some((id) => !STEAM_ID64.test(id))) {
      throw new BadRequestException("All SteamIDs must be 17-digit numbers");
    }

    const group = await this.family.getOrCreate(userId);
    const existing = new Set(group.members.map((m) => m.steamId));
    const friends = await this.prisma.friendship.findMany({
      where: { userId, friendSteamId: { in: ids } },
    });
    const friendMap = new Map(friends.map((f) => [f.friendSteamId, f]));

    const skipped: string[] = [];
    const newIds: string[] = [];
    for (const steamId of ids) {
      if (!friendMap.has(steamId) || existing.has(steamId)) {
        skipped.push(steamId);
        continue;
      }
      newIds.push(steamId);
    }

    if (newIds.length) {
      this.assertRoom(group.members.length, newIds.length);
    }

    const added: Awaited<ReturnType<typeof this.upsertMember>>[] = [];
    for (const steamId of newIds) {
      const friend = friendMap.get(steamId)!;
      const member = await this.upsertMember(
        group.id,
        steamId,
        {
          personaName: friend.personaName,
          avatarUrl: friend.avatarUrl,
          userId: friend.friendUserId,
        },
        { syncLibrary: false },
      );
      added.push(member);
    }

    return {
      added: added.length,
      skipped: skipped.length,
      members: added,
    };
  }

  async removeMember(userId: string, steamId: string) {
    const id = steamId.trim();
    if (!STEAM_ID64.test(id)) {
      throw new BadRequestException("SteamID64 must be a 17-digit number");
    }

    const group = await this.family.getOrCreate(userId);
    const member = group.members.find((m) => m.steamId === id);
    if (!member) {
      throw new NotFoundException("Member is not in your family group");
    }
    if (member.role === "owner") {
      throw new BadRequestException(
        "You can't remove yourself from the family group.",
      );
    }

    await this.prisma.familyMember.delete({ where: { id: member.id } });
    return { ok: true as const };
  }

  private assertRoom(currentCount: number, adding: number) {
    if (currentCount + adding > FAMILY_MEMBER_LIMIT) {
      const remaining = Math.max(0, FAMILY_MEMBER_LIMIT - currentCount);
      throw new BadRequestException(
        remaining === 0
          ? `Family groups can have at most ${FAMILY_MEMBER_LIMIT} people, including you.`
          : `Only ${remaining} more member${remaining === 1 ? "" : "s"} can be added (max ${FAMILY_MEMBER_LIMIT}, including you).`,
      );
    }
  }

  private async upsertMember(
    groupId: string,
    steamId: string,
    profile: {
      personaName: string;
      avatarUrl: string | null;
      userId?: string | null;
    },
    opts: { syncLibrary: boolean },
  ) {
    const existingUser =
      profile.userId != null
        ? { id: profile.userId }
        : await this.accounts.findUserBySteamId(steamId);

    const member = await this.prisma.familyMember.upsert({
      where: { groupId_steamId: { groupId, steamId } },
      create: {
        groupId,
        steamId,
        userId: existingUser?.id,
        personaName: profile.personaName,
        avatarUrl: profile.avatarUrl,
        role: "member",
      },
      update: {
        userId: existingUser?.id,
        personaName: profile.personaName,
        avatarUrl: profile.avatarUrl,
      },
    });

    if (!existingUser && opts.syncLibrary) {
      await this.family.cacheMemberLibrary(steamId);
    }

    return member;
  }
}
