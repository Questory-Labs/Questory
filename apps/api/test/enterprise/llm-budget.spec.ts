import { describe, expect, it, vi } from "vitest";
import { EnterpriseAdminController } from "../../src/enterprise/enterprise-admin.controller";

const user = { userId: "admin-1" } as Parameters<
  EnterpriseAdminController["getLlmBudget"]
>[0];

const build = () => {
  const forward = vi.fn(async () => ({ ok: true }));
  const assertAllowed = vi.fn(async () => undefined);
  const controller = new EnterpriseAdminController(
    { forward } as never,
    { assertAllowed } as never,
  );
  return { controller, forward, assertAllowed };
};

describe("EnterpriseAdminController llm budget", () => {
  it("forwards reads as an admin", async () => {
    const { controller, forward, assertAllowed } = build();
    await controller.getLlmBudget(user);
    expect(assertAllowed).toHaveBeenCalledWith("admin-1", "admin");
    expect(forward).toHaveBeenCalledWith(
      expect.objectContaining({
        isAdmin: true,
        method: "GET",
        path: "/v1/enterprise/llm/budget",
      }),
    );
  });

  it("forwards updates with the body untouched", async () => {
    const { controller, forward } = build();
    const body = { period: "weekly", totalUsd: 5, models: {} };
    await controller.putLlmBudget(user, body);
    expect(forward).toHaveBeenCalledWith(
      expect.objectContaining({
        isAdmin: true,
        method: "PUT",
        path: "/v1/enterprise/llm/budget",
        body,
      }),
    );
  });
});
