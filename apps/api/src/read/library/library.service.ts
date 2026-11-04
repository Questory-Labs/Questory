import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UsersService } from "../../watch/users/users.service";
import type { ReadLibrarySort } from "@questorylabs/shared";

export const READ_LIBRARY_GENRE_OPTIONS_LIMIT = 100;

function libraryOrderBy(sort: ReadLibrarySort | undefined) {
  switch (sort) {
    case "score":
      return [
        { score: { sort: "desc" as const, nulls: "last" as const } },
        { updatedAt: "desc" as const },
      ];
    case "title":
      return [{ readTitle: { name: "asc" as const } }, { id: "asc" as const }];
    case "updated":
      return [{ updatedAt: "desc" as const }, { id: "asc" as const }];
    default:
      return [{ listedAt: "desc" as const }, { updatedAt: "desc" as const }];
  }
}

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
      category?: string;
      q?: string;
      minScore?: number;
      genre?: string;
      sort?: ReadLibrarySort;
    } = {},
  ) {
    const user = await this.users.resolveUser(userId);
    if (!user) throw new NotFoundException("Read user not found");

    const take = Math.min(Math.max(opts.pageSize ?? 40, 1), 100);
    const safePage = Math.max(opts.page ?? 1, 1);
    const skip = (safePage - 1) * take;
    const q = opts.q?.trim();

    const genre = opts.genre?.trim();
    const baseWhere = {
      userId: user.id,
      ...(opts.minScore != null ? { score: { gte: opts.minScore } } : {}),
      ...(opts.format || opts.category || q || genre
        ? {
            readTitle: {
              ...(opts.format ? { format: opts.format } : {}),
              ...(opts.category ? { category: opts.category } : {}),
              ...(q
                ? { name: { contains: q, mode: "insensitive" as const } }
                : {}),
              ...(genre
                ? {
                    genres: {
                      some: {
                        genre: {
                          name: { equals: genre, mode: "insensitive" as const },
                        },
                      },
                    },
                  }
                : {}),
            },
          }
        : {}),
    };
    const where = {
      ...baseWhere,
      ...(opts.status ? { listStatus: opts.status } : {}),
    };

    const [total, rows, statusRows, genreRows] = await Promise.all([
      this.prisma.readListState.count({ where }),
      this.prisma.readListState.findMany({
        where,
        orderBy: libraryOrderBy(opts.sort),
        skip,
        take,
        include: {
          readTitle: {
            include: { genres: { include: { genre: true } } },
          },
        },
      }),
      this.prisma.readListState.groupBy({
        by: ["listStatus"],
        where: baseWhere,
        _count: { _all: true },
      }),
      this.prisma.genre.findMany({
        where: {
          readTitles: {
            some: { readTitle: { listStates: { some: { userId: user.id } } } },
          },
        },
        orderBy: { name: "asc" },
        take: READ_LIBRARY_GENRE_OPTIONS_LIMIT,
        select: { name: true },
      }),
    ]);

    return {
      total,
      page: safePage,
      pageSize: take,
      statusCounts: (statusRows ?? [])
        .map((r) => ({ status: r.listStatus, count: r._count._all }))
        .sort((a, b) => b.count - a.count),
      genreOptions: (genreRows ?? []).map((g) => g.name),
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
          category: r.readTitle.category,
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
