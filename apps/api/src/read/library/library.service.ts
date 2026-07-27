import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UsersService } from "../../watch/users/users.service";

@Injectable()
export class ReadLibraryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async list(
    userId: string,
    opts: {
      page?: number;
      pageSize?: number;
      status?: string;
      format?: string;
      q?: string;
      minScore?: number;
    } = {},
  ) {
    const user = await this.users.resolveUser(userId);
    if (!user) throw new NotFoundException("Read user not found");

    const take = Math.min(Math.max(opts.pageSize ?? 40, 1), 100);
    const safePage = Math.max(opts.page ?? 1, 1);
    const skip = (safePage - 1) * take;
    const q = opts.q?.trim();

    const where = {
      userId: user.id,
      ...(opts.status ? { listStatus: opts.status } : {}),
      ...(opts.minScore != null ? { score: { gte: opts.minScore } } : {}),
      ...(opts.format || q
        ? {
            readTitle: {
              ...(opts.format ? { format: opts.format } : {}),
              ...(q
                ? { name: { contains: q, mode: "insensitive" as const } }
                : {}),
            },
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.readListState.count({ where }),
      this.prisma.readListState.findMany({
        where,
        orderBy: [{ listedAt: "desc" }, { updatedAt: "desc" }],
        skip,
        take,
        include: {
          readTitle: {
            include: { genres: { include: { genre: true } } },
          },
        },
      }),
    ]);

    return {
      total,
      page: safePage,
      pageSize: take,
      items: rows.map((r) => ({
        id: r.id,
        listStatus: r.listStatus,
        score: r.score,
        progressChapters: r.progressChapters,
        progressVolumes: r.progressVolumes,
        listedAt: r.listedAt?.toISOString() ?? null,
        title: {
          id: r.readTitle.id,
          name: r.readTitle.name,
          format: r.readTitle.format,
          coverUrl: r.readTitle.coverUrl,
          chapters: r.readTitle.chapters,
          volumes: r.readTitle.volumes,
          year: r.readTitle.year,
          genres: r.readTitle.genres.map((g) => g.genre.name),
        },
      })),
    };
  }
}
