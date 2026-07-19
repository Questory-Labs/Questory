import { describe, expect, it, afterEach } from "vitest";
import { UnauthorizedException } from "@nestjs/common";
import { WebhooksService } from "../../src/webhooks/webhooks.service";

describe("webhook spoofing", () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  function service(users: {
    findByWebhookToken: (t: string) => Promise<{ id: string } | null>;
    resolveSoleUser: () => Promise<{ id: string } | null>;
  }) {
    return new WebhooksService({} as any, {} as any, users as any);
  }

  it("requires ApiKey outside local", async () => {
    process.env.APP_MODE = "selfhosted";
    const svc = service({
      findByWebhookToken: async () => null,
      resolveSoleUser: async () => ({ id: "u1" }),
    });
    await expect(svc.resolveWebhookUser(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("rejects wrong ApiKey", async () => {
    process.env.APP_MODE = "local";
    const svc = service({
      findByWebhookToken: async () => null,
      resolveSoleUser: async () => ({ id: "u1" }),
    });
    await expect(svc.resolveWebhookUser("wrong")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("accepts valid ApiKey and binds user", async () => {
    process.env.APP_MODE = "selfhosted";
    const svc = service({
      findByWebhookToken: async (t) =>
        t === "hook-secret" ? { id: "u42" } : null,
      resolveSoleUser: async () => null,
    });
    await expect(svc.resolveWebhookUser("hook-secret")).resolves.toEqual({
      id: "u42",
    });
  });

  it("allows sole-user fallback only in local when secret unset", async () => {
    process.env.APP_MODE = "local";
    const svc = service({
      findByWebhookToken: async () => null,
      resolveSoleUser: async () => ({ id: "sole" }),
    });
    await expect(svc.resolveWebhookUser(undefined)).resolves.toEqual({
      id: "sole",
    });
  });
});
