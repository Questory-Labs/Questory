import { PrismaService } from "../prisma/prisma.service";

export const APP_CONFIG_SIGNUP_ENABLED = "signupEnabled";

export async function isSignupOpen(prisma: PrismaService): Promise<boolean> {
  const adminCount = await prisma.user.count({ where: { isAdmin: true } });
  if (adminCount === 0) return true;
  const row = await prisma.appConfig.findUnique({
    where: { key: APP_CONFIG_SIGNUP_ENABLED },
  });
  if (!row) return true;
  return row.value === "true";
}

export async function getSignupEnabledSetting(
  prisma: PrismaService,
): Promise<boolean> {
  const row = await prisma.appConfig.findUnique({
    where: { key: APP_CONFIG_SIGNUP_ENABLED },
  });
  if (!row) return true;
  return row.value === "true";
}

export async function setSignupEnabled(
  prisma: PrismaService,
  enabled: boolean,
): Promise<void> {
  await prisma.appConfig.upsert({
    where: { key: APP_CONFIG_SIGNUP_ENABLED },
    create: { key: APP_CONFIG_SIGNUP_ENABLED, value: enabled ? "true" : "false" },
    update: { value: enabled ? "true" : "false" },
  });
}
