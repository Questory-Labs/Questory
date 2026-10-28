import {
  ForbiddenException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { PrismaService } from "../prisma/prisma.service";
import type { EnterpriseProxyService } from "../enterprise/enterprise-proxy.service";
import { RECAP_USER_PREFIX } from "../recap/monthly-recap.service";

export async function deleteUserAccount(
  deps: {
    prisma: PrismaService;
    enterprise?: EnterpriseProxyService | null;
    logger: Logger;
  },
  id: string,
) {
  const { prisma } = deps;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundException("User not found");
  if (user.isAdmin) {
    const adminCount = await prisma.user.count({
      where: { isAdmin: true },
    });
    if (adminCount <= 1) {
      throw new ForbiddenException("Cannot delete the last admin");
    }
  }
  await eraseEnterpriseData(deps, id);
  await prisma.user.delete({ where: { id } });
  await prisma.appConfig.deleteMany({ where: { key: `${RECAP_USER_PREFIX}${id}` } });
  return { ok: true };
}

async function eraseEnterpriseData(
  deps: { enterprise?: EnterpriseProxyService | null; logger: Logger },
  id: string,
) {
  if (!deps.enterprise) return;
  try {
    await deps.enterprise.forward({
      userId: id,
      isAdmin: true,
      method: "DELETE",
      path: `/v1/enterprise/users/${encodeURIComponent(id)}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const unreachable = err instanceof ServiceUnavailableException;
    if (unreachable && !process.env.ENTERPRISE_URL) {
      deps.logger.warn(`QEngine not reachable; skipped data erase for ${id}: ${message}`);
      return;
    }
    deps.logger.error(`QEngine data erase failed for ${id}: ${message}`);
    throw new ServiceUnavailableException(
      "Could not erase recommendation data; the account was not deleted. Try again.",
    );
  }
}
