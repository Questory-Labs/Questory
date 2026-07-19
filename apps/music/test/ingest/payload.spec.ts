import { describe, expect, it } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { ListenBrainzService } from "../../src/listenbrainz/listenbrainz.service";

describe("listen payload abuse", () => {
  const service = new ListenBrainzService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );

  it("rejects more than 1000 listens", async () => {
    const payload = Array.from({ length: 1001 }, () => ({
      listened_at: 1,
      track_metadata: { artist_name: "A", track_name: "T" },
    }));
    await expect(
      service.submitListens("u1", { listen_type: "import", payload }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects empty payload", async () => {
    await expect(
      service.submitListens("u1", { listen_type: "single", payload: [] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
