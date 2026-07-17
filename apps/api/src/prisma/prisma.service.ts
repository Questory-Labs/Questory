import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "../generated/prisma/client";

function resolveDbProvider(): "sqlite" | "postgresql" {
  const explicit = (process.env.DATABASE_PROVIDER || "").toLowerCase().trim();
  if (explicit === "sqlite" || explicit === "sqlite3") return "sqlite";
  if (explicit === "postgres" || explicit === "postgresql") return "postgresql";

  const url = process.env.DATABASE_URL || "";
  if (url.startsWith("file:")) return "sqlite";
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    return "postgresql";
  }

  return "sqlite";
}

function createAdapter() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  // Load adapters lazily so Postgres Docker images don't require better-sqlite3.
  if (resolveDbProvider() === "postgresql") {
    const { PrismaPg } =
      require("@prisma/adapter-pg") as typeof import("@prisma/adapter-pg");
    return new PrismaPg({ connectionString: url });
  }

  const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3") as typeof import("@prisma/adapter-better-sqlite3");
  return new PrismaBetterSqlite3({ url });
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({ adapter: createAdapter() });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
