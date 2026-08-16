import { UnauthorizedException } from "@nestjs/common";
import type { SessionPayload } from "@questorylabs/shared/session";
import { PrismaService } from "../prisma/prisma.service";

export type LiveSessionUser = {
  id: string;
  sessionEpoch: number;
  disabledAt: Date | null;
  emailVerifiedAt: Date | null;
  email: string | null;
  isAdmin: boolean;
};

export async function loadLiveSessionUser(
  prisma: PrismaService,
  session: SessionPayload,
): Promise<LiveSessionUser> {
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      sessionEpoch: true,
      disabledAt: true,
      emailVerifiedAt: true,
      email: true,
      isAdmin: true,
    },
  });
  if (!user || user.disabledAt) {
    throw new UnauthorizedException("Not authenticated");
  }
  const cookieEpoch = session.epoch ?? 0;
  if (cookieEpoch !== user.sessionEpoch) {
    throw new UnauthorizedException("Not authenticated");
  }
  return user;
}
