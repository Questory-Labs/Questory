import { PrismaService } from "../prisma/prisma.service";
import { isQuestoryCloud } from "../lib/runtime-config";
import { isMailerActive } from "../mail/smtp-config";

export const APP_CONFIG_REQUIRE_EMAIL_VERIFICATION = "requireEmailVerification";

export async function isEmailVerificationRequired(
  prisma: PrismaService,
): Promise<boolean> {
  if (!isMailerActive()) return false;
  const row = await prisma.appConfig.findUnique({
    where: { key: APP_CONFIG_REQUIRE_EMAIL_VERIFICATION },
  });
  if (!row) return isQuestoryCloud();
  return row.value === "true";
}

export async function getRequireEmailVerificationSetting(
  prisma: PrismaService,
): Promise<boolean> {
  const row = await prisma.appConfig.findUnique({
    where: { key: APP_CONFIG_REQUIRE_EMAIL_VERIFICATION },
  });
  if (!row) return isQuestoryCloud();
  return row.value === "true";
}

export async function setRequireEmailVerification(
  prisma: PrismaService,
  enabled: boolean,
): Promise<void> {
  await prisma.appConfig.upsert({
    where: { key: APP_CONFIG_REQUIRE_EMAIL_VERIFICATION },
    create: {
      key: APP_CONFIG_REQUIRE_EMAIL_VERIFICATION,
      value: enabled ? "true" : "false",
    },
    update: { value: enabled ? "true" : "false" },
  });
}
