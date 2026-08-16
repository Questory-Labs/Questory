import { describe, expect, it } from "vitest";
import { resolveSmtpConfig, isMailerActive } from "../../src/mail/smtp-config";

describe("smtp-config", () => {
  it("is inactive unless enabled and configured", () => {
    expect(
      isMailerActive({
        SMTP_HOST: "smtp.example.com",
        SMTP_FROM: "a@b.c",
      } as NodeJS.ProcessEnv),
    ).toBe(false);
    expect(
      isMailerActive({
        SMTP_ENABLED: "true",
        SMTP_FROM: "a@b.c",
      } as NodeJS.ProcessEnv),
    ).toBe(false);
    const active = resolveSmtpConfig({
      SMTP_ENABLED: "true",
      SMTP_HOST: "smtp.example.com",
      SMTP_FROM: "Questory <a@b.c>",
      SMTP_PORT: "587",
    } as NodeJS.ProcessEnv);
    expect(active.active).toBe(true);
    expect(active.config?.port).toBe(587);
    expect(active.config?.secure).toBe(false);
  });

  it("defaults secure on port 465", () => {
    const status = resolveSmtpConfig({
      SMTP_ENABLED: "yes",
      SMTP_HOST: "smtp.example.com",
      SMTP_FROM: "a@b.c",
      SMTP_PORT: "465",
    } as NodeJS.ProcessEnv);
    expect(status.config?.secure).toBe(true);
  });
});
