import { NotFoundException } from "@nestjs/common";
import type { PrismaService } from "../../prisma/prisma.service";
import type { UsersService } from "../users/users.service";

export async function disconnectSourceConnection(
  prisma: PrismaService,
  users: UsersService,
  userId: string,
  provider: string,
) {
  const user = await users.resolveUser(userId);
  if (!user) throw new NotFoundException("User not found");
  const result = await prisma.sourceConnection.deleteMany({
    where: { userId: user.id, provider },
  });
  return { ok: true as const, disconnected: result.count > 0 };
}
