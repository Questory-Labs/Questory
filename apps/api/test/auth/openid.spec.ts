import { describe, expect, it, vi, beforeEach } from "vitest";
import { AuthService } from "../../src/auth/auth.service";
import { isSteamIdAllowed } from "../../src/lib/runtime-config";

describe("AuthService OpenID verify", () => {
  const prisma = {} as any;
  const steam = { getPlayerSummaries: vi.fn() } as any;
  const sync = { enqueueAll: vi.fn() } as any;
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService(prisma, steam, sync);
    vi.restoreAllMocks();
  });

  it("rejects callback without is_valid:true", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          "ns:http://specs.openid.net/auth/2.0\nis_valid:false\n",
        ),
      ),
    );
    await expect(
      service.verifySteamOpenId({
        "openid.claimed_id":
          "https://steamcommunity.com/openid/id/76561198000000000",
        "openid.mode": "id_res",
      }),
    ).rejects.toThrow(/verification failed/i);
  });

  it("rejects wrong claimed_id shape", async () => {
    await expect(
      service.verifySteamOpenId({
        "openid.claimed_id": "https://evil.example/openid/id/1",
      }),
    ).rejects.toThrow(/Invalid Steam OpenID/);
  });

  it("returns steamId when Steam confirms", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          "ns:http://specs.openid.net/auth/2.0\nis_valid:true\n",
        ),
      ),
    );
    const id = await service.verifySteamOpenId({
      "openid.claimed_id":
        "https://steamcommunity.com/openid/id/76561198000000000",
      "openid.mode": "id_res",
    });
    expect(id).toBe("76561198000000000");
  });
});

describe("allowlist", () => {
  it("denies when allowlist set and id missing", () => {
    process.env.ALLOWED_STEAM_IDS = "76561198000000001";
    expect(isSteamIdAllowed("76561198000000000")).toBe(false);
    expect(isSteamIdAllowed("76561198000000001")).toBe(true);
    delete process.env.ALLOWED_STEAM_IDS;
  });

  it("allows all when allowlist empty", () => {
    delete process.env.ALLOWED_STEAM_IDS;
    expect(isSteamIdAllowed("76561198000000000")).toBe(true);
  });
});
