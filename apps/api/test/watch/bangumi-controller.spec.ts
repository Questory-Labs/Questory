import { describe, expect, it, vi } from "vitest";
import { BangumiController } from "../../src/watch/bangumi/bangumi.controller";
import { SessionUserGuard } from "../../src/watch/auth/session-user.guard";
import type { BangumiService } from "../../src/watch/bangumi/bangumi.service";
import type { FeatureFlagsService } from "../../src/features/feature-flags.service";
import { describeOAuthController } from "./list-provider-controller-cases";

let watchOn = true;
const flags = {
  isDomainEnabled: vi.fn(async () => watchOn),
} as unknown as FeatureFlagsService;

describeOAuthController({
  label: "Watch Bangumi",
  path: "watch/bangumi",
  Controller: BangumiController,
  guard: SessionUserGuard,
  build: (service) =>
    new BangumiController(service as unknown as BangumiService, flags),
  describeRedirects: (run) => {
    const build = () =>
      new BangumiController(
        { exchangeCode: vi.fn().mockResolvedValue({ ok: true }) } as unknown as BangumiService,
        flags,
      );

    describe("redirect", () => {
      it("returns to the watch tab when watch is enabled", async () => {
        watchOn = true;
        expect(await run(build())).toBe(
          "https://app.example/sources?tab=watch&bangumi=connected",
        );
      });

      it("returns to the read tab when watch is disabled", async () => {
        watchOn = false;
        expect(await run(build())).toBe(
          "https://app.example/sources?tab=read&bangumi=connected",
        );
      });
    });
  },
});
