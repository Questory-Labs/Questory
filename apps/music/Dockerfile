ARG DATABASE_PROVIDER=postgresql

FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/music/package.json apps/music/
COPY apps/api/package.json apps/api/
COPY apps/watch/package.json apps/watch/
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS build
ARG DATABASE_PROVIDER=postgresql
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/music/node_modules ./apps/music/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY . .
ENV DATABASE_PROVIDER=${DATABASE_PROVIDER}
ENV DATABASE_URL=postgresql://questorylabs:questorylabs@postgres:5432/questorylabs
RUN mkdir -p apps/api/src/generated/prisma apps/music/src/generated/prisma apps/watch/src/generated/prisma \
  && if [ "$DATABASE_PROVIDER" = "sqlite" ] || [ "$DATABASE_PROVIDER" = "sqlite3" ]; then \
      export DATABASE_URL="file:/data/questorylabs.db"; \
    fi \
  && pnpm --filter @questorylabs/shared build \
  && pnpm --filter @questorylabs/db run build \
  && node scripts/sync-prisma-schema.mjs \
  && pnpm --filter @questorylabs/db exec prisma generate \
  && pnpm --filter @questorylabs/music run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable \
  && mkdir -p /data
COPY --from=build /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/music ./apps/music
COPY --from=build /app/packages/db ./packages/db
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/scripts ./scripts
WORKDIR /app/apps/music
EXPOSE 4010
CMD ["sh", "-c", "node ../../scripts/sync-prisma-schema.mjs && cd ../../packages/db && pnpm exec prisma generate && pnpm exec prisma db push && cd ../../apps/music && node dist/main.js"]
