import { describe, expect, it } from "vitest";
import { resolveListSyncHalves } from "../../src/features/list-sync-scope";
import type { FeatureFlagsService } from "../../src/features/feature-flags.service";

function flags(enabled: {
  source?: boolean;
  watch?: boolean;
  read?: boolean;
}): FeatureFlagsService {
  return {
    isSourceEnabled: async () => enabled.source !== false,
    isDomainEnabled: async (domain: string) => {
      if (domain === "watch") return enabled.watch !== false;
      if (domain === "read") return enabled.read !== false;
      return true;
    },
  } as unknown as FeatureFlagsService;
}

describe("resolveListSyncHalves", () => {
  it("skips when the source is off", async () => {
    expect(
      await resolveListSyncHalves(flags({ source: false }), "anilist"),
    ).toEqual({ skip: true, watch: false, read: false });
  });

  it("runs manga only when Watch is off", async () => {
    expect(
      await resolveListSyncHalves(flags({ watch: false }), "anilist"),
    ).toEqual({ skip: false, watch: false, read: true });
  });

  it("skips when both domains are off", async () => {
    expect(
      await resolveListSyncHalves(
        flags({ watch: false, read: false }),
        "anilist",
      ),
    ).toEqual({ skip: true, watch: false, read: false });
  });

  it("honors an explicit read scope", async () => {
    expect(
      await resolveListSyncHalves(flags({}), "mal", "read"),
    ).toEqual({ skip: false, watch: false, read: true });
  });
});
