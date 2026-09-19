import type { PrismaService } from "../prisma/prisma.service";

export function isPrismaAdmissionConflict(err: unknown): boolean {
  if (typeof err !== "object" || err === null || !("code" in err)) return false;
  const code = (err as { code: unknown }).code;
  return code === "P2002" || code === "P2034";
}

export async function ensureImportJobRunningLock(prisma: PrismaService) {
  await prisma.$executeRaw`
    CREATE UNIQUE INDEX IF NOT EXISTS "ImportJob_userId_source_running_key"
    ON "ImportJob" ("userId", "source")
    WHERE "status" = 'running'
  `;
}

export async function ensureExportJobInFlightLock(prisma: PrismaService) {
  await prisma.$executeRaw`
    CREATE UNIQUE INDEX IF NOT EXISTS "ProfileExportJob_userId_inflight_key"
    ON "ProfileExportJob" ("userId")
    WHERE "status" IN ('pending', 'running')
  `;
}
