ARG DATABASE_PROVIDER=postgresql

FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS build
ARG DATABASE_PROVIDER=postgresql
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .
ENV DATABASE_PROVIDER=${DATABASE_PROVIDER}
# Placeholder URL for generate; runtime DATABASE_URL overrides for db push / app
ENV DATABASE_URL=postgresql://questorylabs:questorylabs@postgres:5432/questorylabs
RUN if [ "$DATABASE_PROVIDER" = "sqlite" ] || [ "$DATABASE_PROVIDER" = "sqlite3" ]; then \
      export DATABASE_URL="file:/data/questorylabs.db"; \
    fi \
  && pnpm --filter @questorylabs/shared build \
  && node scripts/sync-prisma-schema.mjs \
  && pnpm --filter @questorylabs/api exec prisma generate \
  && pnpm --filter @questorylabs/api run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable \
  && mkdir -p /data
COPY --from=build /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/scripts ./scripts
WORKDIR /app/apps/api
EXPOSE 4000
# Regenerate Prisma client for the runtime DATABASE_PROVIDER so one image can serve SQLite or Postgres
CMD ["sh", "-c", "node ../../scripts/sync-prisma-schema.mjs && pnpm exec prisma generate && pnpm exec prisma db push && node dist/main.js"]
