# One Dockerfile, three targets:
#   api    – NestJS API (production dependencies only)
#   web    – Next.js standalone server
#   tools  – full workspace with Prisma CLI, used for migrations, seeding and the admin CLI

ARG NODE_IMAGE=node:22.20.0-bookworm-slim

FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/* \
  && corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/config/package.json packages/config/
COPY packages/database/package.json packages/database/
COPY packages/game-engine/package.json packages/game-engine/
COPY packages/localization/package.json packages/localization/
COPY packages/phonics-engine/package.json packages/phonics-engine/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY . .
# Rewrites are resolved at build time; inside compose the API is reachable as http://api:4000.
ARG API_INTERNAL_URL=http://api:4000
ENV API_INTERNAL_URL=${API_INTERNAL_URL}
# Loose env mode passes proxy/CA settings of the build host through to Prisma and Next.js.
RUN pnpm turbo run build --env-mode=loose

FROM build AS tools
ENV NODE_ENV=production
CMD ["pnpm", "--filter", "@engame/database", "migrate:deploy"]

FROM build AS api-prune
# Fresh production-only install of the API and its workspace dependencies, keeping the built dist folders.
RUN rm -rf node_modules apps/*/node_modules packages/*/node_modules
RUN --mount=type=cache,id=pnpm,target=/pnpm/store CI=true pnpm install --prod --frozen-lockfile --filter "@engame/api..." \
  && pnpm --filter @engame/database exec prisma generate \
  && rm -rf apps/web packages/*/src packages/*/test apps/api/src apps/api/test

FROM ${NODE_IMAGE} AS api
# Prisma's query engine needs libssl; compose runs the process under an init (init: true).
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production PORT=4000 STORAGE_LOCAL_DIR=/data/uploads
WORKDIR /repo
COPY --from=api-prune --chown=node:node /repo /repo
RUN mkdir -p /data/uploads && chown node:node /data/uploads
USER node
WORKDIR /repo/apps/api
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:4000/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]

FROM ${NODE_IMAGE} AS web
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]
