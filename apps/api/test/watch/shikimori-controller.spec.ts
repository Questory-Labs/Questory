import { describe, expect, it, vi } from "vitest";
import { ShikimoriController } from "../../src/watch/shikimori/shikimori.controller";
import { SessionUserGuard } from "../../src/watch/auth/session-user.guard";
import type { ShikimoriService } from "../../src/watch/shikimori/shikimori.service";
import type { FeatureFlagsService } from "../../src/features/feature-flags.service";
import { describeOAuthController } from "./list-provider-controller-cases";

let watchOn = true;
const flags = {
  isDomainEnabled: vi.fn(async () => watchOn),
} as unknown as FeatureFlagsService;

describeOAuthController({
  label: "Watch Shikimori",
  path: "watch/shikimori",
  Controller: ShikimoriController,
  guard: SessionUserGuard,
  build: (service) =>
    new ShikimoriController(service as unknown as ShikimoriService, flags),
  describeRedirects: (run) => {
    const build = () =>
      new ShikimoriController(
        { exchangeCode: vi.fn().mockResolvedValue({ ok: true }) } as unknown as ShikimoriService,
        flags,
      );

    describe("redirect", () => {
      it("returns to the watch tab when watch is enabled", async () => {
        watchOn = true;
        expect(await run(build())).toBe(
          "https://app.example/sources?tab=watch&shikimori=connected",
        );
      });

      it("returns to the read tab when watch is disabled", async () => {
        watchOn = false;
        expect(await run(build())).toBe(
          "https://app.example/sources?tab=read&shikimori=connected",
        );
      });
    });
  },
});
