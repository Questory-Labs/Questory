FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/cron/package.json apps/cron/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter @questorylabs/cron...

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/cron/node_modules ./apps/cron/node_modules
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/cron ./apps/cron
RUN pnpm --filter @questorylabs/cron run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY --from=build /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/cron ./apps/cron
WORKDIR /app/apps/cron
CMD ["node", "dist/main.js"]
