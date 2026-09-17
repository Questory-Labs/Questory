import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { FAMILY_MEMBER_LIMIT } from "@questorylabs/shared";
import { FamilyMembersService } from "../../src/family/family-members.service";

const OWNER_ID = "76561198000000001";
const MEMBER_2 = "76561198000000002";
const MEMBER_3 = "76561198000000003";
const MEMBER_4 = "76561198000000004";
const MEMBER_5 = "76561198000000005";
const MEMBER_6 = "76561198000000006";
const MEMBER_7 = "76561198000000007";

const owner = {
  id: "m-owner",
  steamId: OWNER_ID,
  personaName: "Alice",
  avatarUrl: null,
  role: "owner",
  userId: "user-1",
};

const member = (steamId: string, index: number) => ({
  id: `m-${index}`,
  steamId,
  personaName: `Member ${index}`,
  avatarUrl: null,
  role: "member",
  userId: null,
});

describe("FamilyMembersService", () => {
  const getOrCreate = vi.fn();
  const cacheMemberLibrary = vi.fn();
  const getPlayerSummaries = vi.fn();
  const findUserBySteamId = vi.fn();
  const upsert = vi.fn();
  const deleteMember = vi.fn();
  const friendshipFindMany = vi.fn();
  let service: FamilyMembersService;

  beforeEach(() => {
    getOrCreate.mockReset();
    cacheMemberLibrary.mockReset();
    getPlayerSummaries.mockReset();
    findUserBySteamId.mockReset();
    upsert.mockReset();
    deleteMember.mockReset();
    friendshipFindMany.mockReset();

    service = new FamilyMembersService(
      {
        familyMember: { upsert, delete: deleteMember },
        friendship: { findMany: friendshipFindMany },
      } as any,
      { getPlayerSummaries } as any,
      { findUserBySteamId } as any,
      { getOrCreate, cacheMemberLibrary } as any,
    );

    findUserBySteamId.mockResolvedValue(null);
    getPlayerSummaries.mockResolvedValue([]);
    cacheMemberLibrary.mockResolvedValue(0);
    upsert.mockImplementation(async ({ create }: { create: unknown }) => create);
  });

  it("rejects adding a new member when the group already has 6 people", async () => {
    getOrCreate.mockResolvedValue({
      id: "group-1",
      members: [
        owner,
        member(MEMBER_2, 2),
        member(MEMBER_3, 3),
        member(MEMBER_4, 4),
        member(MEMBER_5, 5),
        member(MEMBER_6, 6),
      ],
    });

    await expect(service.addMember("user-1", MEMBER_7)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(upsert).not.toHaveBeenCalled();
  });

  it("refreshes a member who is already in a full group", async () => {
    getOrCreate.mockResolvedValue({
      id: "group-1",
      members: [
        owner,
        member(MEMBER_2, 2),
        member(MEMBER_3, 3),
        member(MEMBER_4, 4),
        member(MEMBER_5, 5),
        member(MEMBER_6, 6),
      ],
    });
    getPlayerSummaries.mockResolvedValue([
      { steamid: MEMBER_2, personaname: "Bob", avatarfull: "https://a" },
    ]);

    await service.addMember("user-1", MEMBER_2);

    expect(upsert).toHaveBeenCalled();
  });

  it("skips friends who are already in the group and adds the rest", async () => {
    getOrCreate.mockResolvedValue({
      id: "group-1",
      members: [owner, member(MEMBER_2, 2)],
    });
    friendshipFindMany.mockResolvedValue([
      {
        friendSteamId: MEMBER_2,
        personaName: "Bob",
        avatarUrl: null,
        friendUserId: null,
      },
      {
        friendSteamId: MEMBER_3,
        personaName: "Carol",
        avatarUrl: null,
        friendUserId: null,
      },
    ]);

    const result = await service.importFromFriends("user-1", [
      MEMBER_2,
      MEMBER_3,
    ]);

    expect(result).toMatchObject({ added: 1, skipped: 1 });
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0]?.[0].create.steamId).toBe(MEMBER_3);
  });

  it("rejects importing more new friends than remaining slots", async () => {
    getOrCreate.mockResolvedValue({
      id: "group-1",
      members: [
        owner,
        member(MEMBER_2, 2),
        member(MEMBER_3, 3),
        member(MEMBER_4, 4),
        member(MEMBER_5, 5),
      ],
    });
    friendshipFindMany.mockResolvedValue([
      {
        friendSteamId: MEMBER_6,
        personaName: "Six",
        avatarUrl: null,
        friendUserId: null,
      },
      {
        friendSteamId: MEMBER_7,
        personaName: "Seven",
        avatarUrl: null,
        friendUserId: null,
      },
    ]);

    await expect(
      service.importFromFriends("user-1", [MEMBER_6, MEMBER_7]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("refuses to remove the family owner", async () => {
    getOrCreate.mockResolvedValue({
      id: "group-1",
      members: [owner, member(MEMBER_2, 2)],
    });

    await expect(service.removeMember("user-1", OWNER_ID)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(deleteMember).not.toHaveBeenCalled();
  });

  it("removes a non-owner member", async () => {
    getOrCreate.mockResolvedValue({
      id: "group-1",
      members: [owner, member(MEMBER_2, 2)],
    });
    deleteMember.mockResolvedValue({});

    await expect(service.removeMember("user-1", MEMBER_2)).resolves.toEqual({
      ok: true,
    });
    expect(deleteMember).toHaveBeenCalledWith({ where: { id: "m-2" } });
  });

  it("returns not found when removing someone who is not in the group", async () => {
    getOrCreate.mockResolvedValue({
      id: "group-1",
      members: [owner],
    });

    await expect(service.removeMember("user-1", MEMBER_2)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("uses the shared family member cap of 6", () => {
    expect(FAMILY_MEMBER_LIMIT).toBe(6);
  });
});
