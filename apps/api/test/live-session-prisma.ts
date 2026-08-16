import { PrismaService } from "../src/prisma/prisma.service";

export function liveSessionUser(id: string) {
  return {
    id,
    sessionEpoch: 0,
    disabledAt: null as Date | null,
    emailVerifiedAt: new Date("2020-01-01T00:00:00.000Z"),
    email: `${id}@example.com`,
    isAdmin: false,
  };
}

export function liveSessionPrismaProvider() {
  return {
    provide: PrismaService,
    useValue: {
      user: {
        findUnique: async ({ where: { id } }: { where: { id: string } }) =>
          liveSessionUser(id),
      },
    },
  };
}
