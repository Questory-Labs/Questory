import { describe, expect, it, vi } from "vitest";
import { ReadBangumiController } from "../../src/read/bangumi/bangumi.controller";
import { ReadSessionUserGuard } from "../../src/read/auth/session-user.guard";
import type { BangumiService } from "../../src/watch/bangumi/bangumi.service";
import { describeOAuthController } from "../watch/list-provider-controller-cases";

const build = (service: unknown) =>
  new ReadBangumiController(service as BangumiService);

describeOAuthController({
  label: "Read Bangumi",
  path: "read/bangumi",
  Controller: ReadBangumiController,
  guard: ReadSessionUserGuard,
  build,
  describeRedirects: (run) => {
    const ctrl = () =>
      build({ exchangeCode: vi.fn().mockResolvedValue({ ok: true }) });

    describe("redirect", () => {
      it("always returns to the read tab", async () => {
        expect(await run(ctrl())).toBe(
          "https://app.example/sources?tab=read&bangumi=connected",
        );
      });

      it("strips a trailing slash from the web origin", async () => {
        vi.stubEnv("WEB_ORIGIN", "https://app.example/");
        expect(await run(ctrl())).toBe(
          "https://app.example/sources?tab=read&bangumi=connected",
        );
      });

      it("falls back to NEXT_PUBLIC_WEB_URL, then localhost", async () => {
        vi.stubEnv("WEB_ORIGIN", "");
        vi.stubEnv("NEXT_PUBLIC_WEB_URL", "https://public.example");
        expect(await run(ctrl())).toBe(
          "https://public.example/sources?tab=read&bangumi=connected",
        );
        vi.stubEnv("NEXT_PUBLIC_WEB_URL", "");
        expect(await run(ctrl())).toBe(
          "http://localhost:3000/sources?tab=read&bangumi=connected",
        );
      });
    });
  },
});
